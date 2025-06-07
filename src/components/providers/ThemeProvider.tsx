"use client";

import { useEffect } from "react";

export default function ThemeProvider() {
  useEffect(() => {
    const d = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (d) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);
  return null;
} 