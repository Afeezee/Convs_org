import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, BarChart3, MessageSquare, Quote, Zap, Target, TrendingUp,
  Brain, Scale, Eye, CheckCircle, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ROTATING_HEADLINES = [
  "Convs — The Intelligent Courtroom of the Internet.",
  "Where Arguments Are Tested, Not Attacked.",
  "Debate with Structure. Reason with Evidence.",
  "Ideas Don't Go Viral. They Go on Trial.",
  "The Infrastructure for Civilised Disagreement.",
];

const FEATURES = [
  {
    icon: Scale,
    title: "Structured Support & Opposition",
    description: "Tag logical flaws or cite strengths. Every response is categorized, analyzed, and transparent.",
  },
  {
    icon: BarChart3,
    title: "Live Argument Analytics",
    description: "Real-time visualizations show support/oppose ratios, quality scores, and flaw distributions.",
  },
  {
    icon: Shield,
    title: "AI-Moderated Discussions",
    description: "Pre-publication moderation detects toxicity, personal attacks, and ensures constructiveness.",
  },
  {
    icon: Quote,
    title: "Highlight-to-Debate Precision",
    description: "Quote specific text fragments to create micro-argument threads tied directly to evidence.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Post a Conv",
    description: "Share your claim or argument — short, long, or media-based.",
    icon: MessageSquare,
  },
  {
    step: "02",
    title: "Support or Oppose",
    description: "Tag logical flaws or strengths. Add evidence. Build structured counter-arguments.",
    icon: Target,
  },
  {
    step: "03",
    title: "See Live Analytics",
    description: "Watch real-time metrics reveal argument quality, flaw rankings, and discourse patterns.",
    icon: TrendingUp,
  },
];

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-30">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-[var(--convs-border)]"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[var(--convs-accent)]"
          animate={{
            x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
            y: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
            scale: [0, 1, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            delay: i * 2,
          }}
        />
      ))}
    </div>
  );
}

function RotatingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_HEADLINES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-[120px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.h1
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-[var(--convs-text)] leading-tight tracking-tight max-w-5xl px-4"
        >
          {ROTATING_HEADLINES[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <AnimatedBackground />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 text-center">
          <RotatingHeadline />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-8 text-lg md:text-xl text-[var(--convs-text-secondary)] leading-relaxed max-w-3xl mx-auto"
          >
            Convs is a next-generation intellectual social network where claims are examined, 
            reasoning is analysed, and discussions are guided by structure — not noise. 
            Support or oppose ideas respectfully, tag logical flaws, and watch live analytics 
            reveal the strength of every argument.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              onClick={() => base44.auth.redirectToLogin(createPageUrl("Home"))}
              size="lg"
              className="bg-[var(--convs-accent)] hover:bg-[var(--convs-accent-hover)] text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Create Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              onClick={() => base44.auth.redirectToLogin(createPageUrl("Home"))}
              variant="outline"
              size="lg"
              className="border-2 border-[var(--convs-accent)] hover:border-[var(--convs-accent-hover)] text-[var(--convs-text)] hover:bg-[var(--convs-accent-light)] px-8 py-6 text-lg font-semibold rounded-xl transition-all"
            >
              Sign In
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-6 text-sm text-[var(--convs-text-muted)] font-medium tracking-wider"
          >
            AI-moderated · Structured · Transparent
          </motion.p>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 px-4 bg-[var(--convs-bg-secondary)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--convs-text)] mb-4">
              Built for Intellectual Integrity
            </h2>
            <p className="text-lg text-[var(--convs-text-secondary)] max-w-2xl mx-auto">
              Every feature is designed to elevate discourse, expose weak reasoning, 
              and reward constructive argumentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="convs-card p-6 group cursor-default"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--convs-accent-light)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-[var(--convs-accent)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--convs-text)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--convs-text-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--convs-text)] mb-4">
              How Convs Works
            </h2>
            <p className="text-lg text-[var(--convs-text-secondary)] max-w-2xl mx-auto">
              Three steps to structured, evidence-based discourse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--convs-accent)]/20 via-[var(--convs-accent)] to-[var(--convs-accent)]/20" />

            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative text-center"
              >
                <div className="inline-flex w-16 h-16 rounded-2xl bg-[var(--convs-accent)] items-center justify-center mb-6 shadow-lg relative z-10">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-6xl font-black text-[var(--convs-accent)]/5 -z-10">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-[var(--convs-text)] mb-3">
                  {step.title}
                </h3>
                <p className="text-[var(--convs-text-secondary)]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="py-16 px-4 bg-[var(--convs-accent-light)] border-y border-[var(--convs-border)]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap items-center justify-center gap-8 text-[var(--convs-text)]">
            <div>
              <p className="text-3xl font-bold text-[var(--convs-accent)]">AI-Powered</p>
              <p className="text-sm text-[var(--convs-text-muted)] mt-1">Moderation</p>
            </div>
            <div className="w-px h-12 bg-[var(--convs-border)]" />
            <div>
              <p className="text-3xl font-bold text-[var(--convs-accent)]">Structured</p>
              <p className="text-sm text-[var(--convs-text-muted)] mt-1">Arguments</p>
            </div>
            <div className="w-px h-12 bg-[var(--convs-border)]" />
            <div>
              <p className="text-3xl font-bold text-[var(--convs-accent)]">Live</p>
              <p className="text-sm text-[var(--convs-text-muted)] mt-1">Analytics</p>
            </div>
            <div className="w-px h-12 bg-[var(--convs-border)]" />
            <div>
              <p className="text-3xl font-bold text-[var(--convs-accent)]">Transparent</p>
              <p className="text-sm text-[var(--convs-text-muted)] mt-1">Discourse</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Brain className="w-16 h-16 mx-auto mb-6 text-[var(--convs-accent)]" />
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--convs-text)] mb-4">
              Ready to Elevate the Conversation?
            </h2>
            <p className="text-lg text-[var(--convs-text-secondary)] mb-8 max-w-2xl mx-auto">
              Join the platform where ideas are tested, not attacked. 
              Where structure beats noise. Where reasoning matters.
            </p>
            <Button
              onClick={() => base44.auth.redirectToLogin(createPageUrl("Home"))}
              size="lg"
              className="bg-[var(--convs-accent)] hover:bg-[var(--convs-accent-hover)] text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Get Started Now
              <CheckCircle className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--convs-border)] py-12 px-4 bg-[var(--convs-bg-secondary)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-[var(--convs-text)] mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-[var(--convs-text-muted)]">
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">About Convs</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--convs-text)] mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-[var(--convs-text-muted)]">
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">Community Guidelines</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--convs-text)] mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-[var(--convs-text-muted)]">
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">API</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--convs-text)] mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-[var(--convs-text-muted)]">
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">hello@convs.io</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-[var(--convs-accent)] transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--convs-border)] flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[var(--convs-accent)]" />
              <span className="font-bold text-[var(--convs-text)]">Convs</span>
            </div>
            <p className="text-sm text-[var(--convs-text-muted)]">
              © 2026 Cereus Technologies. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}