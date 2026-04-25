"use client";

import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert, Activity, Navigation } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 max-w-3xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          Every Second Matters
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6">
          Clear the path.<br />
          <span className="text-gradient">Save a life.</span>
        </h1>
        
        <p className="text-slate-400 text-lg sm:text-xl mb-12 leading-relaxed">
          Lookout connects hospital dispatchers, ambulance crews, and road users in real time — clearing the path so emergency vehicles reach patients when it matters most.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mx-auto">
          <RoleCard 
            href="/login?returnUrl=/admin&role=admin" 
            title="Dispatcher" 
            desc="Dispatch ambulances & monitor fleet"
            icon={<Activity className="w-6 h-6 text-blue-400" />}
            delay={0.1}
          />
          <RoleCard 
            href="/login?returnUrl=/driver&role=driver" 
            title="Ambulance Driver" 
            desc="Live navigation & route clearing"
            icon={<ShieldAlert className="w-6 h-6 text-rose-400" />}
            delay={0.2}
          />
          <RoleCard 
            href="/login?returnUrl=/road-user&role=road-user" 
            title="Road User" 
            desc="Get proximity alerts to move aside"
            icon={<Navigation className="w-6 h-6 text-emerald-400" />}
            delay={0.3}
          />
        </div>
      </motion.div>
    </main>
  );
}

function RoleCard({ href, title, desc, icon, delay }: { href: string, title: string, desc: string, icon: React.ReactNode, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link href={href} className="block group">
        <div className="glass-card p-6 h-full transition-all duration-300 hover:bg-slate-800/50 hover:scale-105 hover:border-slate-600/50 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors" />
          <div className="mb-4 p-3 bg-slate-900/50 rounded-xl inline-block border border-slate-800">
            {icon}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm mb-6">{desc}</p>
          <div className="flex items-center text-sm font-medium text-slate-300 group-hover:text-white transition-colors mt-auto">
            Access Portal <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
