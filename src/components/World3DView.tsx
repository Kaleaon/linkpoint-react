import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  Compass,
  Eye,
  Camera,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Shield,
  Zap,
  DollarSign,
  Info,
  Maximize2,
  RefreshCw,
  LogOut,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Activity,
  Radio,
  Wifi,
  Layers,
  Terminal, X,
} from "lucide-react";
import {
  api,
  type Session,
  type SLWorldObject,
  type RadarAvatar,
  type LSLDialog,
  type RealSimWorldData,
  type UDPCircuitStatus,
} from "../api";
import { LslDialogModal } from "./LslDialogModal";
import { EconomyModal } from "./EconomyModal";

interface Props {
  session: Session;
  onOpenEconomy?: () => void;
  onOpenAppearance?: () => void;
  onOpenEvents?: () => void;
}

export const World3DView: React.FC<Props> = ({ session, onOpenEconomy, onOpenAppearance }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Real Simulator Data & UDP Circuit State
  const [simData, setSimData] = useState<RealSimWorldData | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<UDPCircuitStatus | null>(null);
  const [showUdpInspector, setShowUdpInspector] = useState(false);
  const [isPingingCircuit, setIsPingingCircuit] = useState(false);
  const [selectedObject, setSelectedObject] = useState<SLWorldObject | null>(null);
  const [activeDialog, setActiveDialog] = useState<LSLDialog | null>(null);
  const [payTarget, setPayTarget] = useState<{ id: string; name: string } | null>(null);

  const [showTeleportUI, setShowTeleportUI] = useState(false);
  const [teleportTarget, setTeleportTarget] = useState("");
  const [isTeleporting, setIsTeleporting] = useState(false);

  const handleTeleport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teleportTarget.trim()) return;
    setIsTeleporting(true);
    try {
      const res = await api.post<{ ok: boolean; region?: string }>("/teleport", {
        session_id: session.session_id,
        region: teleportTarget.trim(),
      });
      if (res.ok) {
        triggerNotice(`Teleported to ${res.region}`);
        setShowTeleportUI(false);
        setTeleportTarget("");
        fetchSimData(); // refresh sim data for new region
      }
    } catch {
      triggerNotice("Teleport failed.");
    } finally {
      setIsTeleporting(false);
    }
  };

  const [inspectObject, setInspectObject] = useState<SLWorldObject | null>(null);

  // Avatar Pose & Movement State
  const [isFlying, setIsFlying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [cameraMode, setCameraMode] = useState<"follow" | "mouselook" | "orbit">("follow");
  const [coords, setCoords] = useState<{ x: number; y: number; z: number }>({ x: 128, y: 128, z: 24.5 });
  const [headingDeg, setHeadingDeg] = useState(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Three.js Scene References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const avatarsGroupRef = useRef<THREE.Group | null>(null);

  // Avatar Rigged Limbs
  const avatarLimbsRef = useRef<{
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    torso: THREE.Mesh;
    head: THREE.Mesh;
  } | null>(null);

  // Movement & Camera Input
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const avatarPos = useRef<THREE.Vector3>(new THREE.Vector3(128, 24.5, 128));
  const avatarRotation = useRef<number>(0);
  const isWalkingRef = useRef<boolean>(false);
  const walkCycleTime = useRef<number>(0);
  const lastAgentUpdateTs = useRef<number>(0);

  // -------------------------------------------------------------
  // FETCH REAL SIMULATOR DATA FROM UDP CIRCUIT
  // -------------------------------------------------------------
  const fetchSimData = useCallback(async () => {
    try {
      const res = await api.get<{ ok: boolean; sim_data: RealSimWorldData; circuit: UDPCircuitStatus }>(
        `/world/sim-data?session_id=${session.session_id}`
      );
      if (res && res.ok) {
        setSimData(res.sim_data);
        setCircuitStatus(res.circuit);
      }
    } catch (e) {
      console.warn("[World3DView] Notice polling UDP sim data:", e);
    }
  }, [session.session_id]);

  useEffect(() => {
    fetchSimData();
    const interval = setInterval(fetchSimData, 3000);
    return () => clearInterval(interval);
  }, [fetchSimData]);

  // Ping UDP circuit on demand
  const handlePingCircuit = async () => {
    setIsPingingCircuit(true);
    try {
      const res = await api.post<{ ok: boolean; latency_ms: number; tx_packets: number; rx_packets: number }>(
        "/udp/ping",
        { session_id: session.session_id }
      );
      if (res.ok) {
        triggerNotice(`UDP Ping: ${res.latency_ms}ms roundtrip`);
        fetchSimData();
      }
    } catch {
      triggerNotice("Circuit ping timeout");
    } finally {
      setIsPingingCircuit(false);
    }
  };

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS HIGH-FIDELITY SCENE
  // -------------------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene & Fog (Atmospheric Windlight Horizon)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060c18);
    scene.fog = new THREE.FogExp2(0x0a1628, 0.0035);
    sceneRef.current = scene;

    // 2. Perspective Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(128, 28, 138);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 4. Atmospheric Windlight Lighting
    const ambientLight = new THREE.AmbientLight(0x4a6585, 0.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x7fb5ff, 0x1a2e40, 0.6);
    scene.add(hemiLight);

    // Sun Directional Light casting high-fidelity soft shadows
    const sunLight = new THREE.DirectionalLight(0xfff3db, 1.4);
    sunLight.position.set(160, 120, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Sky Dome with Stars
    const skyGeo = new THREE.SphereGeometry(600, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x050d1a,
      side: THREE.BackSide,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // 5. Real 3D Regional Terrain Heightmap (PlaneGeometry 256x256m)
    // Centered at (128, 0, 128) covering region coordinates (0..256m)
    const terrainGeo = new THREE.PlaneGeometry(256, 256, 63, 63);
    terrainGeo.rotateX(-Math.PI / 2);

    // Initialize vertex elevations & vertex colors
    const posAttr = terrainGeo.attributes.position;
    const vertexColors = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      // Default elevation base: 21m
      posAttr.setY(i, 21.0);
      // Default lush grass color
      vertexColors[i * 3] = 0.22;
      vertexColors[i * 3 + 1] = 0.42;
      vertexColors[i * 3 + 2] = 0.18;
    }

    terrainGeo.setAttribute("color", new THREE.BufferAttribute(vertexColors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.position.set(128, 0, 128);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);
    terrainMeshRef.current = terrainMesh;

    // 6. Water Surface Plane (at sim waterHeight = 20.0m)
    const waterGeo = new THREE.PlaneGeometry(512, 512, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x08537a,
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.78,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(128, 20.0, 128);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // 7. Sim Objects Group (Prims decoded from UDP ObjectUpdate packets)
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // 8. Avatars Group (Avatars decoded from UDP CoarseLocationUpdate packets)
    const avatarsGroup = new THREE.Group();
    scene.add(avatarsGroup);
    avatarsGroupRef.current = avatarsGroup;

    // 9. User Avatar Humanoid Model
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(128, 24.5, 128);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    avatarGroup.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.05;
    head.castShadow = true;
    avatarGroup.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.26, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 2.1;
    avatarGroup.add(hair);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.5, 1.3, 0);
    leftArm.castShadow = true;
    avatarGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.5, 1.3, 0);
    rightArm.castShadow = true;
    avatarGroup.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.9, 0.24);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.45, 0);
    leftLeg.castShadow = true;
    avatarGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.2, 0.45, 0);
    rightLeg.castShadow = true;
    avatarGroup.add(rightLeg);

    // Avatar floating name tag sprite
    const canvasTag = document.createElement("canvas");
    canvasTag.width = 256;
    canvasTag.height = 64;
    const ctxTag = canvasTag.getContext("2d");
    if (ctxTag) {
      ctxTag.fillStyle = "rgba(5, 8, 16, 0.85)";
      ctxTag.roundRect(10, 10, 236, 44, 8);
      ctxTag.fill();
      ctxTag.strokeStyle = "#00F0FF";
      ctxTag.lineWidth = 2;
      ctxTag.stroke();
      ctxTag.fillStyle = "#00F0FF";
      ctxTag.font = "bold 20px monospace";
      ctxTag.textAlign = "center";
      ctxTag.fillText(session.avatar_name || "Resident", 128, 38);
    }
    const tagTex = new THREE.CanvasTexture(canvasTag);
    const tagMat = new THREE.SpriteMaterial({ map: tagTex, transparent: true });
    const tagSprite = new THREE.Sprite(tagMat);
    tagSprite.position.set(0, 2.6, 0);
    tagSprite.scale.set(2.4, 0.6, 1);
    avatarGroup.add(tagSprite);

    scene.add(avatarGroup);
    avatarGroupRef.current = avatarGroup;
    avatarLimbsRef.current = { leftLeg, rightLeg, leftArm, rightArm, torso, head };

    // 10. Responsive Resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 11. Animation Loop & Real UDP AgentUpdate Transmission
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Subtle water wave undulation
      if (waterMeshRef.current) {
        const posWater = waterMeshRef.current.geometry.attributes.position;
        for (let i = 0; i < posWater.count; i++) {
          const u = posWater.getX(i);
          const v = posWater.getY(i);
          const z = Math.sin(u * 0.08 + elapsed * 1.5) * 0.25 + Math.cos(v * 0.08 + elapsed * 1.1) * 0.18;
          posWater.setZ(i, z);
        }
        posWater.needsUpdate = true;
      }

      // Locomotion & Controls
      const avatar = avatarGroupRef.current;
      const limbs = avatarLimbsRef.current;

      if (avatar && !isSitting) {
        let moveX = 0;
        let moveZ = 0;
        let turn = 0;

        const keys = keysPressed.current;
        const speed = isRunning ? 12 : isFlying ? 9 : 5.5;

        if (keys["KeyW"] || keys["ArrowUp"]) moveZ -= 1;
        if (keys["KeyS"] || keys["ArrowDown"]) moveZ += 1;
        if (keys["KeyA"]) moveX -= 1;
        if (keys["KeyD"]) moveX += 1;
        if (keys["ArrowLeft"] || keys["KeyQ"]) turn += 1;
        if (keys["ArrowRight"] || keys["KeyE"]) turn -= 1;

        if (turn !== 0) {
          avatarRotation.current += turn * delta * 2.5;
        }

        avatar.rotation.y = avatarRotation.current;
        setHeadingDeg(Math.round((-avatarRotation.current * 180) / Math.PI) % 360);

        const isMoving = moveX !== 0 || moveZ !== 0;
        isWalkingRef.current = isMoving;

        if (isMoving) {
          walkCycleTime.current += delta * (isRunning ? 12 : 7);

          const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            avatarRotation.current
          );
          const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            avatarRotation.current
          );

          const moveDir = new THREE.Vector3()
            .addScaledVector(forward, -moveZ)
            .addScaledVector(right, moveX)
            .normalize();

          avatarPos.current.addScaledVector(moveDir, speed * delta);

          // Bound coordinates within region (4m to 252m)
          avatarPos.current.x = Math.max(4, Math.min(252, avatarPos.current.x));
          avatarPos.current.z = Math.max(4, Math.min(252, avatarPos.current.z));

          // Set height from terrain elevation if walking, or allow vertical flight
          if (!isFlying) {
            // Find terrain height at current position
            const gx = Math.min(63, Math.max(0, Math.floor((avatarPos.current.x / 256) * 64)));
            const gy = Math.min(63, Math.max(0, Math.floor((avatarPos.current.z / 256) * 64)));
            let groundHeight = 21.0;
            if (terrainMeshRef.current) {
              const posAttrT = terrainMeshRef.current.geometry.attributes.position;
              const vIdx = gy * 64 + gx;
              if (vIdx < posAttrT.count) {
                groundHeight = posAttrT.getY(vIdx);
              }
            }
            avatarPos.current.y = THREE.MathUtils.lerp(avatarPos.current.y, Math.max(20.0, groundHeight), 0.2);
          } else {
            if (keys["KeyE"] || keys["PageUp"]) avatarPos.current.y += 6 * delta;
            if (keys["KeyC"] || keys["PageDown"]) avatarPos.current.y -= 6 * delta;
            avatarPos.current.y = Math.max(20.5, Math.min(120, avatarPos.current.y));
          }

          avatar.position.copy(avatarPos.current);

          setCoords({
            x: Math.round(avatarPos.current.x),
            y: Math.round(avatarPos.current.z),
            z: Math.round(avatarPos.current.y * 10) / 10,
          });

          // Animate limb walk cycle
          if (limbs) {
            const cycle = Math.sin(walkCycleTime.current);
            limbs.leftLeg.rotation.x = cycle * 0.6;
            limbs.rightLeg.rotation.x = -cycle * 0.6;
            limbs.leftArm.rotation.x = -cycle * 0.5;
            limbs.rightArm.rotation.x = cycle * 0.5;
          }

          // Throttle dispatch of authentic Second Life AgentUpdate UDP packet (every 250ms)
          const now = Date.now();
          if (now - lastAgentUpdateTs.current > 250) {
            lastAgentUpdateTs.current = now;
            let controlFlags = 0;
            if (moveZ < 0) controlFlags |= 0x00000001; // AGENT_CONTROL_AT_POS
            if (moveZ > 0) controlFlags |= 0x00000002; // AGENT_CONTROL_AT_NEG
            if (moveX > 0) controlFlags |= 0x00000004; // AGENT_CONTROL_LEFT_POS
            if (moveX < 0) controlFlags |= 0x00000008; // AGENT_CONTROL_LEFT_NEG
            if (isFlying) controlFlags |= 0x00000010;  // AGENT_CONTROL_FLY

            api.post("/udp/agent-update", {
              session_id: session.session_id,
              camera_center: [avatarPos.current.x, avatarPos.current.y + 2, avatarPos.current.z],
              camera_at_axis: [moveDir.x, 0, moveDir.z],
              body_rotation: [0, Math.sin(avatarRotation.current / 2), 0, Math.cos(avatarRotation.current / 2)],
              control_flags: controlFlags,
            }).catch(() => {});
          }
        } else {
          // Reset limbs to idle pose
          if (limbs) {
            limbs.leftLeg.rotation.x = THREE.MathUtils.lerp(limbs.leftLeg.rotation.x, 0, 0.15);
            limbs.rightLeg.rotation.x = THREE.MathUtils.lerp(limbs.rightLeg.rotation.x, 0, 0.15);
            limbs.leftArm.rotation.x = THREE.MathUtils.lerp(limbs.leftArm.rotation.x, 0, 0.15);
            limbs.rightArm.rotation.x = THREE.MathUtils.lerp(limbs.rightArm.rotation.x, 0, 0.15);
          }
        }

        // Camera Follow Mode
        if (cameraMode === "follow" && cameraRef.current) {
          const offset = new THREE.Vector3(0, 2.5, 6.5).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            avatarRotation.current
          );
          const targetCamPos = avatarPos.current.clone().add(offset);
          cameraRef.current.position.lerp(targetCamPos, 0.12);
          cameraRef.current.lookAt(avatarPos.current.clone().add(new THREE.Vector3(0, 1.8, 0)));
        } else if (cameraMode === "mouselook" && cameraRef.current) {
          const eyePos = avatarPos.current.clone().add(new THREE.Vector3(0, 2.05, 0));
          cameraRef.current.position.copy(eyePos);
          const lookDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            avatarRotation.current
          );
          cameraRef.current.lookAt(eyePos.clone().add(lookDir));
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === "KeyF") setIsFlying((prev) => !prev);
      if (e.code === "KeyR") setIsRunning((prev) => !prev);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      renderer.dispose();
    };
  }, [session.session_id, cameraMode, isFlying, isRunning, isSitting]);

  // -------------------------------------------------------------
  // UPDATE REAL 3D TERRAIN HEIGHTMAP FROM UDP LAYERDATA PACKETS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!terrainMeshRef.current || !simData?.terrain || simData.terrain.length === 0) return;

    const terrain = simData.terrain;
    const waterHeight = simData.waterHeight || 20.0;
    const mesh = terrainMeshRef.current;
    const geo = mesh.geometry;
    const posAttr = geo.attributes.position;
    const colorAttr = geo.attributes.color;

    // The PlaneGeometry is 64 vertices along X and 64 vertices along Y (total 4096)
    for (let gy = 0; gy < 64 && gy < terrain.length; gy++) {
      const row = terrain[gy];
      for (let gx = 0; gx < 64 && gx < row.length; gx++) {
        const vIdx = gy * 64 + gx;
        if (vIdx < posAttr.count) {
          const elevation = Number(row[gx]);
          posAttr.setY(vIdx, elevation);

          // Color coding based on elevation & water level
          let r = 0.22, g = 0.42, b = 0.18; // Default meadow grass
          if (elevation < waterHeight) {
            // Underwater seabed
            r = 0.14; g = 0.26; b = 0.20;
          } else if (elevation >= waterHeight && elevation < waterHeight + 1.8) {
            // Sandy coastal shoreline
            r = 0.78; g = 0.68; b = 0.48;
          } else if (elevation >= 32.0) {
            // Mountain peak stone
            r = 0.38; g = 0.42; b = 0.46;
          }

          colorAttr.setXYZ(vIdx, r, g, b);
        }
      }
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Position water plane at real sim waterHeight
    if (waterMeshRef.current) {
      waterMeshRef.current.position.y = waterHeight;
    }
  }, [simData?.terrain, simData?.waterHeight]);

  // -------------------------------------------------------------
  // RENDER REAL SIM OBJECTS DECODED FROM UDP OBJECTUPDATE PACKETS
  // -------------------------------------------------------------
  useEffect(() => {
    const group = objectsGroupRef.current;
    if (!group || !simData?.objects) return;

    // Clear previous object meshes
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    simData.objects.forEach((obj) => {
      const objGroup = new THREE.Group();
      // Map region coordinates: x -> x, z -> y (height), y -> z (depth)
      objGroup.position.set(obj.position[0], obj.position[2], obj.position[1]);
      if (obj.rotation) {
        objGroup.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
      }
      objGroup.userData = { id: obj.id, localId: obj.local_id, objectData: obj };

      let geom: THREE.BufferGeometry;
      const colorVal = new THREE.Color(obj.color || "#00f0ff");

      // Render prim shapes supported by Second Life UDP protocol
      if (obj.shape === "cylinder") {
        geom = new THREE.CylinderGeometry(obj.scale[0] / 2, obj.scale[0] / 2, obj.scale[2], 24);
      } else if (obj.shape === "sphere") {
        geom = new THREE.SphereGeometry(obj.scale[0] / 2, 24, 24);
      } else if (obj.shape === "torus") {
        geom = new THREE.TorusGeometry(obj.scale[0] / 2, 0.25, 16, 32);
      } else {
        // Standard box / kiosk / prim
        geom = new THREE.BoxGeometry(obj.scale[0], obj.scale[2], obj.scale[1]);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: colorVal,
        roughness: 0.35,
        metalness: 0.25,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.y = obj.scale[2] / 2;
      objGroup.add(mesh);

      // Render authentic Second Life Hover Text billboard sprite
      if (obj.hover_text) {
        const lines = obj.hover_text.split("\n");
        const canvasH = document.createElement("canvas");
        canvasH.width = 384;
        canvasH.height = Math.max(64, lines.length * 32 + 20);
        const ctxH = canvasH.getContext("2d");
        if (ctxH) {
          ctxH.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctxH.roundRect(10, 10, 364, canvasH.height - 20, 8);
          ctxH.fill();
          ctxH.font = "bold 20px monospace";
          ctxH.textAlign = "center";
          ctxH.fillStyle = "#00F0FF";
          lines.forEach((line, idx) => {
            ctxH.fillText(line, 192, 34 + idx * 28);
          });
        }
        const tex = new THREE.CanvasTexture(canvasH);
        const sMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(sMat);
        sprite.position.y = obj.scale[2] + 0.8;
        sprite.scale.set(3.2, 0.8, 1);
        objGroup.add(sprite);
      }

      group.add(objGroup);
    });
  }, [simData?.objects]);

  // -------------------------------------------------------------
  // RENDER REAL AVATARS DECODED FROM UDP COARSE LOCATION UPDATE
  // -------------------------------------------------------------
  useEffect(() => {
    const group = avatarsGroupRef.current;
    if (!group || !simData?.avatars) return;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    simData.avatars.forEach((av) => {
      const avGroup = new THREE.Group();
      avGroup.position.set(av.position[0], av.position[2] || 24, av.position[1]);

      // Simple avatar proxy mesh
      const avMat = new THREE.MeshStandardMaterial({ color: 0xb026ff, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 12), avMat);
      body.position.y = 0.8;
      avGroup.add(body);

      // Name tag
      const canvasAv = document.createElement("canvas");
      canvasAv.width = 256;
      canvasAv.height = 48;
      const ctxAv = canvasAv.getContext("2d");
      if (ctxAv) {
        ctxAv.fillStyle = "rgba(10, 15, 30, 0.85)";
        ctxAv.roundRect(8, 8, 240, 32, 6);
        ctxAv.fill();
        ctxAv.font = "bold 16px monospace";
        ctxAv.fillStyle = "#B026FF";
        ctxAv.textAlign = "center";
        ctxAv.fillText(`${av.name} (${av.distance}m)`, 128, 29);
      }
      const tagTex = new THREE.CanvasTexture(canvasAv);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, transparent: true }));
      tag.position.y = 2.0;
      tag.scale.set(2.0, 0.5, 1);
      avGroup.add(tag);

      group.add(avGroup);
    });
  }, [simData?.avatars]);

  // -------------------------------------------------------------
  // CANVAS RAYCASTING FOR IN-WORLD PRIM INTERACTION
  // -------------------------------------------------------------
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    const group = objectsGroupRef.current;
    if (!canvas || !camera || !group) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const intersects = raycaster.intersectObjects(group.children, true);
    if (intersects.length > 0) {
      let topObj: THREE.Object3D | null = intersects[0].object;
      while (topObj && !topObj.userData?.objectData && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj?.userData?.objectData) {
        const objData = topObj.userData.objectData as SLWorldObject;
        setSelectedObject(objData);
        setInspectObject(objData);
      }
    } else {
      setSelectedObject(null);
    }
  };

  // Perform authentic interaction via UDP
  const handlePerformAction = async (action: "touch" | "sit" | "stand" | "pay" | "take") => {
    if (!selectedObject) return;

    try {
      const res = await api.post<{ ok: boolean; action: string; message: string; position?: [number, number, number] }>(
        "/world/interact",
        {
          session_id: session.session_id,
          object_id: selectedObject.id,
          action,
        }
      );

      if (res.ok) {
        triggerNotice(res.message || `Interacted with ${selectedObject.name}`);
        if (action === "sit") {
          setIsSitting(true);
          if (res.position && avatarGroupRef.current) {
            avatarPos.current.set(res.position[0], res.position[2], res.position[1]);
            avatarGroupRef.current.position.copy(avatarPos.current);
          }
        } else if (action === "stand") {
          setIsSitting(false);
          avatarPos.current.y += 0.8;
        } else if (action === "pay") {
          setPayTarget({ id: selectedObject.id, name: selectedObject.owner_name });
        }
        fetchSimData();
      }
    } catch (e: any) {
      triggerNotice(e?.message || "Action failed");
    } finally {
      setSelectedObject(null);
    }
  };

  const simulatorInfo = simData?.simulatorInfo ?? null;
  const formatShortId = (value?: string | null) =>
    value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "—";
  const terrainBands = simulatorInfo
    ? (["00", "01", "10", "11"] as const).map((band) => ({
        band,
        start: simulatorInfo.terrain.startHeightsMeters[band],
        range: simulatorInfo.terrain.heightRangesMeters[band],
      }))
    : [];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] bg-[#050810] border border-[#1E2D4A] rounded-xl overflow-hidden font-mono select-none flex flex-col"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Top Floating Region & Sim HUD */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-[#050810]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#00F0FF]/30 text-xs pointer-events-auto">
          <div className="flex items-center gap-1.5 text-[#00F0FF] font-bold">
            <Compass className="w-4 h-4 text-[#00F0FF]" />
            <span>{simData?.regionName || session.region || "Second Life Region"}</span>
          </div>
          <span className="text-[#334155]">|</span>
          <div className="text-[11px] text-[#94A3B8]">
            <span className="text-[#CBD5E1] font-semibold">
              {coords.x}, {coords.y}, {coords.z}
            </span>
          </div>
          <span className="text-[#334155]">|</span>
          <div className="text-[10px] text-[#00FF66] font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>{simData?.simFps ? `${simData.simFps} FPS` : "45.0 FPS"}</span>
          </div>
        </div>

        {/* Top-Right Tools & UDP Circuit Status Badge */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* UDP Circuit Inspector Toggle Button */}
          <button
            onClick={() => setShowUdpInspector((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-md transition-colors ${
              circuitStatus?.connected
                ? "bg-[#00FF66]/15 border-[#00FF66]/40 text-[#00FF66] hover:bg-[#00FF66]/25"
                : "bg-[#050810]/85 border-[#1E2D4A] text-[#94A3B8] hover:text-[#00F0FF]"
            }`}
            title="Inspect Live UDP Circuit Datagrams"
          >
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>UDP {circuitStatus?.ping_ms ? `${circuitStatus.ping_ms}ms` : "ACTIVE"}</span>
          </button>

          {/* Camera View Switcher */}
          <button
            onClick={() => setCameraMode((prev) => (prev === "follow" ? "mouselook" : "follow"))}
            className="flex items-center gap-1 bg-[#050810]/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#1E2D4A] text-xs text-[#94A3B8] hover:text-[#00F0FF] hover:border-[#00F0FF]/40 transition-colors"
            title="Toggle Camera View"
          >
            {cameraMode === "follow" ? <Camera className="w-3.5 h-3.5 text-[#00F0FF]" /> : <Eye className="w-3.5 h-3.5 text-[#B026FF]" />}
            <span className="capitalize">{cameraMode}</span>
          </button>
        </div>
      </div>

      {/* Action Notice Overlay */}
      {actionNotice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-[#050810]/95 backdrop-blur-md border border-[#00F0FF] text-[#00F0FF] text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-[#00F0FF]/20 animate-fade-in pointer-events-none z-30">
          {actionNotice}
        </div>
      )}

      {/* Selected In-World Prim Context Action Menu */}
      {selectedObject && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#050810]/95 backdrop-blur-md border border-[#00F0FF] rounded-xl p-3 shadow-2xl z-20 flex flex-col gap-2 min-w-[280px]">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-2">
            <div>
              <div className="text-xs font-bold text-[#F8FAFC] truncate max-w-[200px]">
                {selectedObject.name}
              </div>
              <div className="text-[10px] text-[#94A3B8]">
                Owner: {selectedObject.owner_name} {selectedObject.local_id && `(LocalID: ${selectedObject.local_id})`}
              </div>
            </div>
            <button
              onClick={() => setSelectedObject(null)}
              className="text-[#94A3B8] hover:text-[#FF3366] text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => handlePerformAction("touch")}
              className="px-2 py-1.5 bg-[#00F0FF]/15 border border-[#00F0FF]/50 text-[#00F0FF] rounded text-[11px] font-bold hover:bg-[#00F0FF]/30 transition-colors"
            >
              Touch (UDP)
            </button>
            <button
              onClick={() => handlePerformAction("sit")}
              className="px-2 py-1.5 bg-[#B026FF]/15 border border-[#B026FF]/50 text-[#B026FF] rounded text-[11px] font-bold hover:bg-[#B026FF]/30 transition-colors"
            >
              Sit Target
            </button>
            <button
              onClick={() => handlePerformAction("pay")}
              className="px-2 py-1.5 bg-[#00FF66]/15 border border-[#00FF66]/50 text-[#00FF66] rounded text-[11px] font-bold hover:bg-[#00FF66]/30 transition-colors"
            >
              Pay L$
            </button>
          </div>
        </div>
      )}

      {/* Live UDP Circuit Inspector Panel */}
      {showUdpInspector && (
        <div className="absolute top-12 right-2 w-80 bg-[#050810]/95 backdrop-blur-md border border-[#00F0FF]/50 rounded-xl p-3 text-xs shadow-2xl z-30 flex flex-col gap-2.5 max-h-[460px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-2">
            <div className="flex items-center gap-1.5 font-bold text-[#00F0FF]">
              <Radio className="w-4 h-4 text-[#00FF66] animate-pulse" />
              <span>SECOND LIFE UDP CIRCUIT</span>
            </div>
            <button
              onClick={() => setShowUdpInspector(false)}
              className="text-[#94A3B8] hover:text-[#FF3366] text-xs"
            >
              ✕
            </button>
          </div>

          {/* Circuit Connection Stats */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0A1020] p-2 rounded-lg border border-[#1E2D4A]">
            <div>
              <span className="text-[#64748B]">Sim Address:</span>
              <div className="text-[#F8FAFC] font-bold truncate">
                {circuitStatus?.sim_ip}:{circuitStatus?.sim_port}
              </div>
            </div>
            <div>
              <span className="text-[#64748B]">Local Port:</span>
              <div className="text-[#F8FAFC] font-bold">
                :{circuitStatus?.local_port || "Dynamic"}
              </div>
            </div>
            <div>
              <span className="text-[#64748B]">Circuit Code:</span>
              <div className="text-[#00F0FF] font-bold font-mono">
                {circuitStatus?.circuit_code || 10001}
              </div>
            </div>
            <div>
              <span className="text-[#64748B]">Ping Latency:</span>
              <div className="text-[#00FF66] font-bold">
                {circuitStatus?.ping_ms || 42} ms
              </div>
            </div>
            <div>
              <span className="text-[#64748B]">TX / RX Packets:</span>
              <div className="text-[#CBD5E1]">
                {circuitStatus?.tx_packets} / {circuitStatus?.rx_packets}
              </div>
            </div>
            <div>
              <span className="text-[#64748B]">Sim / Physics FPS:</span>
              <div className="text-[#CBD5E1]">
                {simData?.simFps || 45.0} / {simData?.physicsFps || 45.0}
              </div>
            </div>
          </div>

          <div className="bg-[#0A1020] p-2 rounded-lg border border-[#1E2D4A] space-y-2">
            <div className="flex items-center gap-1 text-[10px] uppercase text-[#64748B] font-bold">
              <Info className="w-3 h-3 text-[#00F0FF]" />
              <span>Simulator Handshake</span>
              {simulatorInfo?.isPartial && (
                <span className="ml-auto text-[#FFEA00] normal-case">partial decode</span>
              )}
            </div>

            {simulatorInfo ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748B]">Access:</span>
                    <div className="text-[#F8FAFC] font-bold uppercase">
                      {simulatorInfo.access.label} ({simulatorInfo.access.code})
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Estate:</span>
                    <div className="text-[#F8FAFC] font-bold">
                      {simulatorInfo.isEstateManager == null
                        ? "Unknown"
                        : simulatorInfo.isEstateManager
                        ? "Manager"
                        : "Resident"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Owner:</span>
                    <div className="text-[#CBD5E1]">{formatShortId(simulatorInfo.ownerId)}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Water / Billable:</span>
                    <div className="text-[#CBD5E1]">
                      {simulatorInfo.waterHeightMeters.toFixed(2)}m /{" "}
                      {simulatorInfo.billableFactor?.toFixed(3) ?? "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Product:</span>
                    <div className="text-[#CBD5E1] truncate">
                      {simulatorInfo.productName || simulatorInfo.productSku || "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Colo / CPU:</span>
                    <div className="text-[#CBD5E1] truncate">
                      {simulatorInfo.coloName || "—"} /{" "}
                      {simulatorInfo.cpuClassId != null ? `${simulatorInfo.cpuClassId}:${simulatorInfo.cpuRatio ?? 0}` : "—"}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-[#94A3B8] space-y-1">
                  <div>
                    Flags:{" "}
                    {simulatorInfo.regionFlags.names.length > 0
                      ? simulatorInfo.regionFlags.names.join(", ")
                      : simulatorInfo.regionFlags.hex}
                  </div>
                  <div>
                    Protocols:{" "}
                    {simulatorInfo.protocols.names.length > 0
                      ? simulatorInfo.protocols.names.join(", ")
                      : simulatorInfo.protocols.hex || "none"}
                  </div>
                  <div>
                    Region ID: {formatShortId(simulatorInfo.regionId)} · Cache:{" "}
                    {formatShortId(simulatorInfo.cacheId)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {terrainBands.map((band) => (
                    <div key={band.band} className="rounded border border-[#1E2D4A] bg-[#050810] px-2 py-1">
                      <div className="text-[#64748B]">Terrain {band.band}</div>
                      <div className="text-[#CBD5E1]">
                        {band.start?.toFixed(2) ?? "—"}m + {band.range?.toFixed(2) ?? "—"}m
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-[11px] text-[#64748B] italic">
                Awaiting simulator region handshake payload...
              </div>
            )}
          </div>

          {/* Ping Trigger Button */}
          <button
            onClick={handlePingCircuit}
            disabled={isPingingCircuit}
            className="w-full py-1.5 bg-[#00F0FF]/15 border border-[#00F0FF]/50 text-[#00F0FF] rounded-lg font-bold text-xs hover:bg-[#00F0FF]/25 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPingingCircuit ? "animate-spin" : ""}`} />
            <span>Send UDP Ping Probe</span>
          </button>

          {/* Live UDP Packet Log Stream */}
          <div>
            <div className="text-[10px] uppercase text-[#64748B] font-bold mb-1 flex items-center gap-1">
              <Terminal className="w-3 h-3 text-[#00F0FF]" />
              <span>Live UDP Packet Stream:</span>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-[10px]">
              {circuitStatus?.recent_packets && circuitStatus.recent_packets.length > 0 ? (
                circuitStatus.recent_packets.slice(0, 10).map((pkt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1 bg-[#050810] border border-[#1E2D4A] rounded"
                  >
                    <span
                      className={`font-bold ${
                        pkt.direction === "tx" ? "text-[#00F0FF]" : "text-[#00FF66]"
                      }`}
                    >
                      [{pkt.direction.toUpperCase()}] {pkt.type}
                    </span>
                    <span className="text-[#64748B] text-[9px]">{pkt.size}B</span>
                  </div>
                ))
              ) : (
                <div className="text-[#64748B] italic">Awaiting UDP packets...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Tactical Controls */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        {/* Left: Fly / Run Toggles */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setIsFlying((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold backdrop-blur-md transition-colors ${
              isFlying
                ? "bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]"
                : "bg-[#050810]/85 border-[#1E2D4A] text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            FLY {isFlying ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setIsRunning((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold backdrop-blur-md transition-colors ${
              isRunning
                ? "bg-[#00FF66]/20 border-[#00FF66] text-[#00FF66]"
                : "bg-[#050810]/85 border-[#1E2D4A] text-[#94A3B8] hover:text-[#F8FAFC]"
            }`}
          >
            RUN {isRunning ? "ON" : "OFF"}
          </button>
          {isSitting && (
            <button
              onClick={() => handlePerformAction("stand")}
              className="px-3 py-1.5 rounded-lg border border-[#FF3366] bg-[#FF3366]/20 text-[#FF3366] text-xs font-bold backdrop-blur-md"
            >
              STAND UP
            </button>
          )}
        </div>

        {/* Right: Quick Action Hub */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {onOpenEconomy && (
            <button
              onClick={onOpenEconomy}
              className="flex items-center gap-1 bg-[#050810]/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-[#00FF66]/30 text-xs text-[#00FF66] font-bold hover:bg-[#00FF66]/15 transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>L$ {simData?.balance || 1000}</span>
            </button>
          )}
        </div>
      </div>


      {/* Teleport UI Overlay */}
      {showTeleportUI && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-[#0A101D]/90 backdrop-blur-md border border-[#00F0FF]/50 p-4 rounded-lg shadow-2xl z-40">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold text-[#00F0FF] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>REGION TELEPORT</span>
            </div>
            <button onClick={() => setShowTeleportUI(false)} className="text-[#64748B] hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleTeleport} className="space-y-3">
            <input
              type="text"
              value={teleportTarget}
              onChange={(e) => setTeleportTarget(e.target.value)}
              placeholder="e.g. Arapaima"
              className="w-full bg-[#050810] border border-[#1E2D4A] rounded px-2.5 py-1.5 text-xs text-[#E2E8F0] placeholder-[#64748B] focus:border-[#00F0FF] focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={isTeleporting || !teleportTarget.trim()}
              className="w-full py-1.5 rounded bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-[10px] font-bold tracking-wider hover:bg-[#00F0FF]/30 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isTeleporting ? "ROUTING..." : "INITIATE TELEPORT"}
            </button>
          </form>
        </div>
      )}

      {/* LSL Dialog Modal if triggered */}
      {activeDialog && (
        <LslDialogModal
          dialog={activeDialog}
          onRespond={async (dId, btn) => {
            try {
              const res = await api.post<{ ok: boolean; reply: string }>("/dialog/respond", {
                session_id: session.session_id,
                dialog_id: dId,
                button: btn,
              });
              if (res.ok) triggerNotice(res.reply);
            } catch {}
            setActiveDialog(null);
          }}
          onDismiss={() => setActiveDialog(null)}
        />
      )}

      {/* Economy Payment Modal */}
      {payTarget && (
        <EconomyModal
          session={session}
          onClose={() => setPayTarget(null)}
          defaultTarget={payTarget}
        />
      )}
    </div>
  );
};
