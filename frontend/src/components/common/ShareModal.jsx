import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Copy, Check, Link, Eye, Clock, Mail } from 'lucide-react';
import { createShare } from '../../services/authService';
import toast from 'react-hot-toast';

// SVG icons for platforms not in lucide
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const SOCIAL_BUTTONS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: WhatsAppIcon,
    color: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20',
    getUrl: (shareUrl, text) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    icon: XIcon,
    color: 'bg-black/10 text-black dark:text-white dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20',
    getUrl: (shareUrl, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: TelegramIcon,
    color: 'bg-[#0088CC]/10 text-[#0088CC] hover:bg-[#0088CC]/20',
    getUrl: (shareUrl, text) => `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    color: 'bg-orange-400/10 text-orange-400 hover:bg-orange-400/20',
    getUrl: (shareUrl, text, origin, dest) =>
      `mailto:?subject=${encodeURIComponent(`EV Trip Plan: ${origin} → ${dest}`)}&body=${encodeURIComponent(text + '\n\n' + shareUrl)}`,
  },
];

const ShareModal = ({ tripData, vehicle, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expiryDays, setExpiryDays] = useState(1);

  const generateLink = async () => {
    setLoading(true);
    try {
      const res = await createShare({ tripData, vehicle, expiryDays });
      const token = res.data.data.token;
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/share/${token}`;
      setShareUrl(url);
      setExpiresAt(res.data.data.expiresAt);
    } catch {
      toast.error('Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy failed — please copy manually');
    }
  };

  const origin = tripData?.origin?.address?.split(',').slice(0, 2).join(',');
  const dest = tripData?.destination?.address?.split(',').slice(0, 2).join(',');
  const shareText = `Check out my EV route from ${origin} to ${dest} — planned on EcoTrack AI!`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="dark:bg-dark-surface bg-white rounded-2xl border dark:border-dark-border border-light-border shadow-2xl w-full max-w-md overflow-hidden"
          data-testid="share-modal"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-dark-border border-light-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-bold dark:text-dark-text text-light-text text-sm">Share Route</h2>
                <p className="text-xs dark:text-dark-muted text-light-muted">Anyone with the link can view this trip</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl dark:hover:bg-dark-highlight hover:bg-light-highlight transition-colors" data-testid="close-share-modal">
              <X className="w-4 h-4 dark:text-dark-muted text-light-muted" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Route preview */}
            <div className="rounded-xl dark:bg-dark-highlight bg-light-highlight p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
                <span className="dark:text-dark-text text-light-text font-medium truncate">{origin}</span>
                <span className="dark:text-dark-muted text-light-muted flex-shrink-0">→</span>
                <span className="dark:text-dark-text text-light-text font-medium truncate">{dest}</span>
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
              </div>
              <div className="flex gap-4 mt-2 text-xs dark:text-dark-muted text-light-muted">
                <span>{tripData?.summary?.totalDistanceKm?.toFixed(0)} km</span>
                <span>{tripData?.summary?.numberOfChargingStops} stops</span>
                {vehicle?.name && <span>{vehicle.name}</span>}
              </div>
            </div>

            {/* Expiry selector */}
            {!shareUrl && (
              <div>
                <label className="block text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wide mb-2">Link expires in</label>
                <div className="flex gap-2">
                  {[1, 3, 7].map((d, index) => (
                    <button
                      key={index} onClick={() => setExpiryDays(d)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${expiryDays === d ? 'border-primary text-primary bg-primary/5' : 'dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted dark:hover:border-primary/40 hover:border-primary/40'}`}
                      data-testid={`expiry-${d}`}
                    >
                      {index === 0 ? '1 day' : index === 1 ? '3 days' : '7 days'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate or show result */}
            {!shareUrl ? (
              <button
                onClick={generateLink} disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm volt-btn transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                data-testid="generate-share-btn"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" /> Generating...</>
                ) : (
                  <><Link className="w-4 h-4" /> Generate Share Link</>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-2xl shadow-lg">
                    <QRCodeSVG
                      value={shareUrl}
                      size={148}
                      bgColor="#ffffff"
                      fgColor="#0B0E14"
                      level="M"
                      data-testid="share-qr-code"
                    />
                  </div>
                </div>

                {/* URL bar */}
                <div className="flex items-center gap-2 rounded-xl dark:bg-dark-highlight bg-light-highlight p-3">
                  <Link className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="flex-1 text-xs dark:text-dark-text text-light-text font-mono truncate">{shareUrl}</p>
                  <button
                    onClick={copyLink}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${copied ? 'bg-emerald-400/10 text-emerald-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                    data-testid="copy-link-btn"
                  >
                    {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>

                {/* Social share buttons */}
                <div>
                  <p className="text-xs dark:text-dark-muted text-light-muted uppercase tracking-wide font-medium mb-2.5">Share via</p>
                  <div className="grid grid-cols-4 gap-2">
                    {SOCIAL_BUTTONS.map(({ id, label, icon: Icon, color, getUrl }) => (
                      <a
                        key={id}
                        href={getUrl(shareUrl, shareText, origin, dest)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all ${color}`}
                        data-testid={`share-${id}-btn`}
                        title={`Share on ${label}`}
                      >
                        <Icon />
                        <span className="text-[10px] leading-tight">{label}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 text-xs dark:text-dark-muted text-light-muted px-1">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {new Date(expiresAt).toLocaleDateString('en-IN')}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Includes map + nav steps</span>
                </div>

                {/* Generate new link */}
                <button
                  onClick={() => { setShareUrl(null); setExpiresAt(null); }}
                  className="w-full text-xs dark:text-dark-muted text-light-muted hover:underline text-center py-1"
                >
                  Generate a new link
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export { ShareModal };
