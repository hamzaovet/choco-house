"use client";

export default function Footer() {
  // Never render global footer: customer storefront has its own 1:1 Whacka footer in page.tsx, and ERP pages must never have a footer
  return null;
}
