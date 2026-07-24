"use client";



import { useState, useCallback, useEffect } from "react";



export function useWhatsNew() {

  const [show, setShow] = useState(false);



  useEffect(() => {

    try {

      const last = localStorage.getItem("teleminiapp-whatsnew-last");

      const current = "2026-07-22";

      if (last !== current) { setShow(true); localStorage.setItem("teleminiapp-whatsnew-last", current); }

    } catch (e) { console.warn('Unhandled error in useWhatsNew', e) }

  }, []);



  const dismiss = useCallback(() => setShow(false), []);



  const features = [

    { date: "2026-07-22", title: "AI ?시?턴??, desc: "DeepSeek AI 기반 채팅" },

    { date: "2026-07-22", title: "발송 기능", desc: "계정 ?택 + 그룹 ?택 + ?제 발송" },

    { date: "2026-07-22", title: "PixelOffice", desc: "??보?에??PixelOffice ?태 ?인" },

  ];



  return { show, dismiss, features };

}

