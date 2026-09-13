import React, { useState, useEffect } from "react";
import { DollarSign, Send, ArrowUpRight, ArrowDownLeft, X, RefreshCw, AlertCircle } from "lucide-react";
import { api, type LindenTransaction, type Session } from "../api";

interface Props {
  session: Session;
  target?: { id: string; name: string } | null;
  onClose: () => void;
  onPaymentSuccess?: (newBalance: number) => void;
}

export const EconomyModal: React.FC<Props> = ({ session, target, onClose, onPaymentSuccess }) => {
  const [balance, setBalance] = useState<number>(1250);
  const [ledger, setLedger] = useState<LindenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipient, setRecipient] = useState(target?.name || "");
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchEconomy = async () => {
    try {
      setLoading(true);
      const [balRes, ledgerRes] = await Promise.all([
        api.get<{ balance: number }>(`/economy/balance?session_id=${session.session_id}`).catch(() => ({ balance: 1250 })),
        api.get<LindenTransaction[]>(`/economy/ledger?session_id=${session.session_id}`).catch(() => [] as LindenTransaction[]),
      ]);
      setBalance(balRes.balance);
      setLedger(ledgerRes);
    } catch (e: any) {
      console.warn("Economy fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomy();
  }, [session.session_id]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customAmount ? parseInt(customAmount, 10) : amount;
    if (!finalAmount || finalAmount <= 0) {
      setStatusMsg({ type: "error", text: "Please specify a valid L$ amount." });
      return;
    }
    if (!recipient.trim()) {
      setStatusMsg({ type: "error", text: "Please enter a recipient avatar or object name." });
      return;
    }
    if (finalAmount > balance) {
      setStatusMsg({ type: "error", text: "Insufficient L$ balance." });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMsg(null);
      const res = await api.post<{ ok: boolean; balance: number; transaction: LindenTransaction; message?: string }>(
        "/economy/pay",
        {
          session_id: session.session_id,
          amount: finalAmount,
          target_id: target?.id || "manual-recipient",
          target_name: recipient.trim(),
          description: memo.trim() || "Direct resident transfer",
        }
      );

      if (res.ok) {
        setBalance(res.balance);
        setLedger((prev) => [res.transaction, ...prev]);
        setStatusMsg({ type: "success", text: `Successfully sent L$ ${finalAmount} to ${recipient}!` });
        setMemo("");
        setCustomAmount("");
        if (onPaymentSuccess) onPaymentSuccess(res.balance);
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Transaction failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-xl border border-[#00F0FF]/40 bg-[#0A101D] shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#050810] px-4 py-3 border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#00F0FF]/20 flex items-center justify-center text-[#00F0FF]">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E2E8F0] tracking-wide">
                Second Life Economy
              </h2>
              <span className="text-[10px] text-[#64748B]">
                Linden Dollar ($L) Manager
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Showcase */}
        <div className="p-4 bg-gradient-to-b from-[#141E30] to-[#0A101D] border-b border-[#1E2D4A] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase text-[#00F0FF] font-semibold tracking-wider block">
              Available Balance
            </span>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1 mt-0.5">
              <span className="text-[#00F0FF]">L$</span>
              <span>{balance.toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={fetchEconomy}
            disabled={loading}
            className="p-2 rounded-lg bg-[#050810] border border-[#1E2D4A] text-[#94A3B8] hover:text-[#00F0FF] transition-colors"
            title="Refresh balance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Main Content: Pay Form & Ledger */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Transfer Form */}
          <form onSubmit={handlePay} className="p-3 rounded-xl bg-[#050810]/70 border border-[#1E2D4A] space-y-3">
            <div className="text-xs font-semibold text-[#00F0FF] flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              <span>Pay Resident or Object</span>
            </div>

            <div>
              <label className="text-[10px] text-[#64748B] uppercase block mb-1">
                Recipient (Avatar / Object Name)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Torley Linden or Tip Jar"
                className="w-full bg-[#0C1322] border border-[#1E2D4A] focus:border-[#00F0FF] text-xs text-[#E2E8F0] px-3 py-2 rounded-lg outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-[#64748B] uppercase block mb-1">
                Quick Select Amount (L$)
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[10, 50, 100, 500].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => {
                      setAmount(val);
                      setCustomAmount("");
                    }}
                    className={`py-1.5 rounded text-xs font-bold border transition-colors ${
                      amount === val && !customAmount
                        ? "bg-[#00F0FF] text-[#050810] border-[#00F0FF]"
                        : "bg-[#141E30] text-[#94A3B8] border-[#1E2D4A] hover:border-[#00F0FF]/40"
                    }`}
                  >
                    L$ {val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                placeholder="Or enter custom L$ amount..."
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full bg-[#0C1322] border border-[#1E2D4A] focus:border-[#00F0FF] text-xs text-[#E2E8F0] px-3 py-1.5 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#64748B] uppercase block mb-1">
                Memo / Description (Optional)
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Tip for nice build"
                className="w-full bg-[#0C1322] border border-[#1E2D4A] focus:border-[#00F0FF] text-xs text-[#E2E8F0] px-3 py-1.5 rounded-lg outline-none"
              />
            </div>

            {statusMsg && (
              <div
                className={`p-2 rounded text-xs flex items-center gap-2 ${
                  statusMsg.type === "success"
                    ? "bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/30"
                    : "bg-[#FF1744]/10 text-[#FF1744] border border-[#FF1744]/30"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{statusMsg.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#00F0FF] hover:bg-[#00E5FF] text-[#050810] font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#00F0FF]/10 disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4" />
              <span>{submitting ? "Processing Transaction..." : `Send L$ ${customAmount || amount}`}</span>
            </button>
          </form>

          {/* Transaction Ledger */}
          <div>
            <div className="text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wide">
              Recent Transactions
            </div>
            <div className="space-y-1.5">
              {ledger.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#64748B]">
                  No recent transaction records
                </div>
              ) : (
                ledger.map((tx) => {
                  const isIncoming = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-lg bg-[#050810] border border-[#1E2D4A] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            isIncoming
                              ? "bg-[#00FF66]/20 text-[#00FF66]"
                              : "bg-[#FF1744]/20 text-[#FF1744]"
                          }`}
                        >
                          {isIncoming ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[#E2E8F0] font-medium truncate">
                            {tx.counterparty}
                          </div>
                          <div className="text-[10px] text-[#64748B] truncate">
                            {tx.description}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        <div
                          className={`font-bold ${
                            isIncoming ? "text-[#00FF66]" : "text-[#FF1744]"
                          }`}
                        >
                          {isIncoming ? "+" : ""}L$ {tx.amount}
                        </div>
                        <div className="text-[9px] text-[#64748B]">
                          {new Date(tx.ts).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
