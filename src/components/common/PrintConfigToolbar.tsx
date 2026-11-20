import React, { useState, useEffect } from 'react';
import { Printer, Sliders, RotateCcw, FileText, Minimize2, Maximize2, Settings2 } from 'lucide-react';

export interface PrintSettings {
  marginTop: number; // in mm (e.g. 10, 15, 20)
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  orientation: 'portrait' | 'landscape';
  fontSizeScale: number; // percentage e.g. 90, 100, 110
  showKop: boolean;
  compactTable: boolean;
}

interface PrintConfigToolbarProps {
  title?: string;
  defaultSettings?: Partial<PrintSettings>;
  onSettingsChange?: (settings: PrintSettings) => void;
  onClose?: () => void;
}

const DEFAULT_SETTINGS: PrintSettings = {
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 15,
  marginRight: 15,
  orientation: 'portrait',
  fontSizeScale: 100,
  showKop: true,
  compactTable: false
};

export const PrintConfigToolbar: React.FC<PrintConfigToolbarProps> = ({
  title = 'Pengaturan Cetak / Print Dokumen',
  defaultSettings,
  onSettingsChange,
  onClose
}) => {
  const [settings, setSettings] = useState<PrintSettings>({
    ...DEFAULT_SETTINGS,
    ...defaultSettings
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(settings);
    }

    // Inject dynamic print stylesheet
    const styleId = 'dynamic-print-config-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
      @media print {
        @page {
          size: A4 ${settings.orientation};
          margin: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm;
        }
        body {
          zoom: ${settings.fontSizeScale}%;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
  }, [settings, onSettingsChange]);

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print bg-slate-900 text-white shadow-xl rounded-2xl p-4 mb-6 transition-all border border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400">
              Margin: {settings.marginTop}mm | Orientasi: {settings.orientation === 'portrait' ? 'Portrait (Tegak)' : 'Landscape (Mendatar)'} | Skala: {settings.fontSizeScale}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings2 className="w-4 h-4 text-indigo-400" />
            {isExpanded ? 'Sembunyikan Pengaturan' : 'Atur Margin & Tampilan'}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            >
              Tutup
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs animate-fadeIn">
          {/* Margins */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">Margin Atas ({settings.marginTop} mm)</label>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={settings.marginTop}
              onChange={(e) => setSettings({ ...settings, marginTop: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">Margin Bawah ({settings.marginBottom} mm)</label>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={settings.marginBottom}
              onChange={(e) => setSettings({ ...settings, marginBottom: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">Margin Kiri ({settings.marginLeft} mm)</label>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={settings.marginLeft}
              onChange={(e) => setSettings({ ...settings, marginLeft: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">Margin Kanan ({settings.marginRight} mm)</label>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={settings.marginRight}
              onChange={(e) => setSettings({ ...settings, marginRight: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Orientation & Scale */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">Orientasi Kertas</label>
            <select
              value={settings.orientation}
              onChange={(e) => setSettings({ ...settings, orientation: e.target.value as 'portrait' | 'landscape' })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="portrait">Portrait (Tegak)</option>
              <option value="landscape">Landscape (Mendatar)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-slate-300 block">Skala Huruf ({settings.fontSizeScale}%)</label>
            <select
              value={settings.fontSizeScale}
              onChange={(e) => setSettings({ ...settings, fontSizeScale: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="80">Kecil (80%)</option>
              <option value="90">Sedang (90%)</option>
              <option value="100">Normal (100%)</option>
              <option value="110">Besar (110%)</option>
            </select>
          </div>

          <div className="space-y-2 flex items-center justify-between pt-6">
            <label className="font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.compactTable}
                onChange={(e) => setSettings({ ...settings, compactTable: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-500 cursor-pointer"
              />
              Mode Tabel Padat (Compact)
            </label>
          </div>

          <div className="flex items-center justify-end pt-4">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 rounded-xl border border-rose-800/50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
