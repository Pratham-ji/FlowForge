import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDemoOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-primary-500/30 overflow-x-hidden">
      <style>{`
        @keyframes drift {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; filter: blur(20px); }
          50% { opacity: 0.8; filter: blur(30px); }
        }
        @keyframes float-node {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -40; }
        }
        .animate-drift { animation: drift 15s ease-in-out infinite; }
        .animate-orbit { animation: orbit 40s linear infinite; }
        .animate-orbit-slow { animation: orbit 60s linear infinite reverse; }
        .animate-pulse-glow { animation: pulse-glow 8s ease-in-out infinite; }
        .animate-float { animation: float-node 6s ease-in-out infinite; }
        .animate-dash { animation: dash 2s linear infinite; }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-drift, .animate-orbit, .animate-orbit-slow, .animate-pulse-glow, .animate-float, .animate-dash {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] transition-shadow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">FlowForge</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
              <a href="#product" className="hover:text-white transition-colors">Product</a>
              <a href="#preview" className="hover:text-white transition-colors">Developers</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">Solutions</a>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign in</Link>
            <Link to="/login" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]">Try FlowForge</Link>
          </div>

          <button className="md:hidden text-gray-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#111] border-b border-white/10 px-4 py-4 space-y-4">
             <a href="#product" className="block text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Product</a>
             <a href="#preview" className="block text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Developers</a>
             <a href="#how-it-works" className="block text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
             <Link to="/login" className="block text-gray-300 hover:text-white">Sign in</Link>
             <Link to="/login" className="block bg-primary-600 text-white text-center px-4 py-2 rounded-md">Try FlowForge</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
          

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 tracking-widest mb-8 backdrop-blur-sm animate-drift">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
              BUILD · AUTOMATE · SCALE
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Workflows <br className="hidden sm:block" />
              that think <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">ahead.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
              Design, automate, and scale complex workflows with the power of code, AI, and open infrastructure.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center justify-center gap-2">
                Try FlowForge
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <button onClick={() => setDemoOpen(true)} className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/5 text-white font-medium border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
                Watch demo
              </button>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 flex items-center justify-center relative min-h-[350px] lg:min-h-[500px]">
             {/* Orbital Graphics - Right Side Focus */}
             <div className="absolute inset-0 flex items-center justify-center opacity-60">
               <svg width="100%" height="100%" viewBox="0 0 800 800" className="animate-orbit max-w-full">
                 <circle cx="400" cy="400" r="300" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                 <circle cx="400" cy="400" r="300" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="10 40" />
                 <circle cx="100" cy="400" r="4" fill="#3b82f6" />
                 <circle cx="700" cy="400" r="4" fill="#3b82f6" />
               </svg>
             </div>
             <div className="absolute inset-0 flex items-center justify-center opacity-50">
               <svg width="70%" height="70%" viewBox="0 0 800 800" className="animate-orbit-slow max-w-full">
                 <circle cx="400" cy="400" r="200" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                 <circle cx="400" cy="400" r="200" fill="none" stroke="rgba(99,102,241,0.5)" strokeWidth="1" strokeDasharray="5 20" />
                 <circle cx="400" cy="200" r="4" fill="#6366f1" />
               </svg>
             </div>
             <div className="absolute inset-0 flex items-center justify-center z-10">
               <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 blur-[30px] opacity-60 animate-pulse-glow"></div>
               <div className="w-16 h-16 rounded-full bg-white/5 border border-white/20 shadow-[0_0_30px_rgba(59,130,246,0.6)] flex items-center justify-center backdrop-blur-md absolute">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 border-y border-white/5 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold tracking-widest text-gray-500 mb-8">ENGINEERED FOR BUILDERS</p>
          {/* Subtle tech patterns / grids here instead of fake logos */}
          <div className="flex justify-center gap-12 opacity-30 grayscale flex-wrap">
             <div className="text-xl font-mono font-bold tracking-tighter">TypeScript</div>
             <div className="text-xl font-mono font-bold tracking-tighter">Haskell</div>
             <div className="text-xl font-mono font-bold tracking-tighter">PostgreSQL</div>
             <div className="text-xl font-mono font-bold tracking-tighter">Docker</div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="product" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { id: '01', title: 'Build Faster', desc: 'Turn ideas into powerful workflow automation.' },
            { id: '02', title: 'Open & Extensible', desc: 'Built for developers who need real control.' },
            { id: '03', title: 'AI-Native', desc: 'Use AI where it actually improves workflow design and execution.' },
            { id: '04', title: 'Secure by Design', desc: 'Organization-aware access control and auditable workflow execution.' }
          ].map((feature) => (
            <div key={feature.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
              <span className="text-primary-500 font-mono text-sm font-bold mb-4 block">{feature.id}</span>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Preview */}
      <section id="preview" className="py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-4 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
            <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              <span className="ml-4 text-xs font-mono text-gray-500">workflow-editor.tsx</span>
            </div>
            
            {/* Visual Node Editor Mockup */}
            <div className="h-[400px] w-full relative flex items-center justify-center">
               <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                 <line x1="50%" y1="20%" x2="50%" y2="45%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                 <line x1="50%" y1="55%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
               </svg>
               <div className="flex flex-col items-center justify-between h-full py-8 w-full z-10">
                 <div className="px-6 py-3 rounded-lg bg-gray-900 border border-white/20 shadow-lg animate-float flex items-center gap-3">
                   <div className="w-8 h-8 rounded bg-primary-500/20 flex items-center justify-center text-primary-400">⚡</div>
                   <div>
                     <div className="text-sm font-semibold">Trigger Event</div>
                     <div className="text-xs text-gray-400 font-mono">on_document_upload</div>
                   </div>
                 </div>
                 <div className="px-6 py-3 rounded-lg bg-gray-900 border border-white/20 shadow-lg animate-float flex items-center gap-3" style={{ animationDelay: '0.5s' }}>
                   <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">🧠</div>
                   <div>
                     <div className="text-sm font-semibold">AI Analysis</div>
                     <div className="text-xs text-gray-400 font-mono">extract_metadata</div>
                   </div>
                 </div>
                 <div className="px-6 py-3 rounded-lg bg-gray-900 border border-white/20 shadow-lg animate-float flex items-center gap-3" style={{ animationDelay: '1s' }}>
                   <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                   <div>
                     <div className="text-sm font-semibold">Auto-Approve</div>
                     <div className="text-xs text-gray-400 font-mono">confidence &gt; 0.95</div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-16 tracking-tight">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { num: '01', title: 'Define', desc: 'Design the workflow.' },
              { num: '02', title: 'Execute', desc: 'Run workflow instances through controlled transitions.' },
              { num: '03', title: 'Observe', desc: 'Inspect execution history and audit events.' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl font-mono text-primary-400 mb-6 relative">
                  {step.num}
                  {i < 2 && <div className="hidden md:block absolute top-1/2 left-[100%] w-full h-px bg-gradient-to-r from-primary-500/50 to-transparent translate-x-4"></div>}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">Ready to forge your next workflow?</h2>
          <Link to="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            Try FlowForge
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary-500/20 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-primary-500"></div></div>
            FlowForge Inc.
          </div>
          <div className="flex gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={() => setDemoOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="demo-title" className="bg-[#111] border border-white/10 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-primary-500/20 text-primary-400 mx-auto flex items-center justify-center mb-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg>
            </div>
            <h3 id="demo-title" className="text-2xl font-bold mb-4">Demo Coming Soon</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">We're putting the final touches on our interactive demo experience. In the meantime, sign in to try the platform directly.</p>
            <button onClick={() => setDemoOpen(false)} className="w-full py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
