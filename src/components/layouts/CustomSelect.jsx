import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 bg-white border border-[#19ADB8] rounded-xl
          text-left cursor-pointer flex items-center justify-between
          hover:border-[#1cd1de] transition-colors"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={16}
          className={`ml-2 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''
            }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer transition
                ${value === opt.value
                  ? 'bg-blue-50 text-004071 font-medium'
                  : 'text-gray-800 hover:bg-gray-100'
                }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
