import React from 'react';
import { X, ShieldCheck, Crosshair, Share2 } from 'lucide-react';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800 max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-chakra text-slate-900">Reguły Bitwy Morskiej</h2>
            <p className="text-xs text-slate-500">Standard battleship-game.org & klasyczne statki</p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
          
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-blue-700 text-sm mb-1">
              1. Plansza i Koordynaty
            </h3>
            <p>
              Plansza to siatka <strong>10×10 pól</strong>. Poziomo podpisana od <strong>A do J</strong>, pionowo od <strong>1 do 10</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-blue-700 text-sm mb-1">
              2. Flota (10 statków – 20 masztów)
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>1 statek na 4 kratki</strong> (Czteromasztowiec)</li>
              <li><strong>2 statki na 3 kratki</strong> (Trójmasztowce)</li>
              <li><strong>3 statki na 2 kratki</strong> (Dwumasztowce)</li>
              <li><strong>4 statki na 1 kratkę</strong> (Jednomasztowce)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-blue-700 text-sm mb-1">
              3. Odstęp pomiędzy statkami
            </h3>
            <p>
              Pomiędzy wszystkimi statkami musi być <strong>minimum jedna kratka przerwy</strong> w każdym kierunku (statki <em>nie mogą</em> stykać się bokami ani rogami po skosie).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-blue-700 text-sm mb-1 flex items-center space-x-1.5">
              <Crosshair className="w-4 h-4 text-rose-600" />
              <span>4. Kolejny strzał i automatyczne X</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Trafienie</strong>: Gracz, który trafił wrogi okręt, natychmiast otrzymuje <strong>prawo do kolejnego strzału</strong>!</li>
              <li><strong>Automatyczne X na skosach</strong>: Po trafieniu segmentu, narożniki po skosie same oznaczają się jako puste pola (X), gdyż żaden statek nie mógłby tam legalnie stać.</li>
              <li><strong>Zatopienie</strong>: Po zatopieniu całego statku, cały 1-kratkowy obrys dookoła jednostki samoczynnie oznacza się na X (pudło), oszczędzając Twoje strzały!</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-semibold text-blue-700 text-sm mb-1 flex items-center space-x-1.5">
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>5. Gra Online & Kolory Floty</span>
            </h3>
            <p>
              Możesz wybrać ulubiony kolor swojej floty (np. szafir, szmaragd, czerwień, purpura). Wystarczy skopiować link do pokoju i wysłać go znajomemu, a wyniki zalogowanych graczy trafią do rankingu dziennego!
            </p>
          </div>

        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-xs"
        >
          Rozumiem, wracam do gry
        </button>
      </div>
    </div>
  );
}
