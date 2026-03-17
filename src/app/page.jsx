"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LogoAnimation() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-r from-[#004071] to-black">
      <motion.div
        className="flex items-center gap-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: 2, staggerChildren: 0.5 },
          },
        }}
      >
        {/* Rotating + symbol */}
        <motion.div
          className="w-20 h-20"
          animate={{ rotate: 360, }}
          transition={{
            repeat: 0,
            duration: 2,
            ease: "easeInOut",
          }}
        >
          <Image
            src="/surgi-partner-favicon.svg"
            alt="SurgiPartner Logo"
            width={80}
            height={80}
          />
        </motion.div>

        {/* Flowing text */}
        <motion.div
          className="flex flex-col"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          <motion.h1 className="text-4xl font-bold text-white">
            Surgi<span className="text-cyan-400">Partner</span>
          </motion.h1>
          <motion.p
            className="text-sm text-gray-300 tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            TRUSTED ONE IN EVERY STEP
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
