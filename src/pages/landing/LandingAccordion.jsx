import React, { useState } from "react";

export function LandingAccordion({ items }) {
  return (
    <div>
      {items.map((item) => (
        <AccordionRow key={item.q} item={item} />
      ))}
    </div>
  );
}

function AccordionRow({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#1F2933]/10 py-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-medium text-[#1F2933]">{item.q}</span>
        <span className="text-[#2F6F5E] text-xl leading-none">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <p className="mt-3 text-sm text-[#4B5563] leading-relaxed max-w-2xl">
          {item.a}
        </p>
      )}
    </div>
  );
}