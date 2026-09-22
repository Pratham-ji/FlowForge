import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useState, useEffect } from 'react';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary-500/30 font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
        @keyframes orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes orbit-slow { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
        @keyframes dash { to { stroke-dashoffset: -8; } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-orbit { animation: orbit 30s linear infinite; }
        .animate-orbit-slow { animation: orbit-slow 45s linear infinite; }
        .animate-dash { animation: dash 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-float, .animate-pulse-glow, .animate-orbit, .animate-orbit-slow, .animate-dash { animation: none; transform: none; opacity: 1; stroke-dasharray: none; }
        }
      `}} />

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <div className="w-3 h-3 rounded-sm bg-white"></div>
              </div>
              <span className="font-bold text-xl tracking-tight">FlowForge</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
              <a href="#problem" className="hover:text-white transition-colors">The Gap</a>
              <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
              <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]">Try FlowForge</Link>
          </div>
          <button className="md:hidden text-gray-300 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={mobileMenuOpen ? "M18 6L6 18M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}/></svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#111] border-b border-white/10 px-4 py-4 space-y-4">
             <a href="#problem" className="block text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>The Gap</a>
             <a href="#capabilities" className="block text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Capabilities</a>
             <a href="#architecture" className="block text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Architecture</a>
             <Link to="/login" className="block text-gray-300 hover:text-white">Sign in</Link>
             <Link to="/register" className="block bg-primary-600 text-white text-center px-4 py-2 rounded-md">Try FlowForge</Link>
          </div>
        )}
      </nav>

      {/* SECTION 1 - HERO */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary-400 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              FlowForge 1.0 is live
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              Workflows that <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">think ahead.</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              FlowForge is a workflow orchestration platform for designing, executing, and observing reliable workflows with controlled state transitions, organization-aware access control, and complete execution history.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Try FlowForge
              </Link>
              <a href="#preview" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 text-white font-semibold hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2">
                Explore how it works
              </a>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex items-center justify-center relative min-h-[400px]">
             <div className="absolute inset-0 flex items-center justify-center opacity-60">
               <svg width="100%" height="100%" viewBox="0 0 800 800" className="animate-orbit max-w-full">
                 <circle cx="400" cy="400" r="300" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                 <circle cx="400" cy="400" r="300" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="10 40" />
                 <circle cx="100" cy="400" r="4" fill="#3b82f6" />
                 <circle cx="700" cy="400" r="4" fill="#3b82f6" />
               </svg>
             </div>
             <div className="relative z-10 bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-md">
               <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                 <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 <span className="text-xs text-gray-500 font-mono ml-2">system.workflow</span>
               </div>
               <div className="space-y-4">
                 <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold">Trigger Event</div>
                      <div className="text-xs text-gray-400">on_document_upload</div>
                    </div>
                    <div className="w-6 h-6 rounded bg-primary-500/20 text-primary-400 flex items-center justify-center">⚡</div>
                 </div>
                 <div className="flex justify-center"><div className="w-px h-6 bg-gradient-to-b from-primary-500/50 to-transparent"></div></div>
                 <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center opacity-80">
                    <div>
                      <div className="text-sm font-semibold">AI Analysis</div>
                      <div className="text-xs text-gray-400">extract_metadata</div>
                    </div>
                    <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">🧠</div>
                 </div>
                 <div className="flex justify-center"><div className="w-px h-6 bg-gradient-to-b from-indigo-500/50 to-transparent"></div></div>
                 <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center opacity-60">
                    <div>
                      <div className="text-sm font-semibold">Decision</div>
                      <div className="text-xs text-gray-400">confidence &gt; 0.95</div>
                    </div>
                    <div className="w-6 h-6 rounded bg-white/10 text-gray-400 flex items-center justify-center">?</div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 - THE GAP */}
      <section id="problem" className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Workflow automation is easy to start.<br/><span className="text-gray-500">Reliable orchestration is harder.</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3">1. Logic becomes fragmented</h3>
              <p className="text-gray-400 leading-relaxed">Workflow behavior gets spread across application code, scripts, queues, and ad-hoc state handling. It's impossible to see the big picture.</p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3">2. Execution becomes difficult to reason about</h3>
              <p className="text-gray-400 leading-relaxed">Teams need controlled transitions and predictable workflow state rather than loosely connected automation steps that break silently.</p>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-3">3. Visibility and accountability disappear</h3>
              <p className="text-gray-400 leading-relaxed">When something runs, fails, or changes state, teams need an auditable execution history and organization-aware access control to trace exactly what happened.</p>
            </div>
          </div>
          <div className="mt-16 inline-block bg-primary-500/10 border border-primary-500/20 text-primary-300 px-6 py-3 rounded-full font-medium">
            FlowForge brings workflow definition, controlled execution, and observability into one system.
          </div>
        </div>
      </section>

      {/* SECTION 3 - WHAT FLOWFORGE ACTUALLY DOES */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16 tracking-tight">From definition to execution to audit.</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
             <div className="flex-1 bg-white/5 p-6 rounded-2xl border border-white/10 relative w-full md:w-auto">
               <div className="text-sm font-mono text-primary-400 mb-2">01. Define</div>
               <div className="font-semibold text-lg">Workflow</div>
               <p className="text-sm text-gray-400 mt-2">Create a workflow and its controlled states/transitions.</p>
             </div>
             <div className="hidden md:block w-8 h-px bg-white/20"></div>
             <div className="flex-1 bg-white/5 p-6 rounded-2xl border border-white/10 relative w-full md:w-auto">
               <div className="text-sm font-mono text-indigo-400 mb-2">02. Execute</div>
               <div className="font-semibold text-lg">Instance</div>
               <p className="text-sm text-gray-400 mt-2">Create workflow instances and move them through valid transitions.</p>
             </div>
             <div className="hidden md:block w-8 h-px bg-white/20"></div>
             <div className="flex-1 bg-white/5 p-6 rounded-2xl border border-white/10 relative w-full md:w-auto">
               <div className="text-sm font-mono text-green-400 mb-2">03. Observe</div>
               <div className="font-semibold text-lg">Audit Event</div>
               <p className="text-sm text-gray-400 mt-2">Inspect execution history and audit events.</p>
             </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - PRODUCT CAPABILITIES */}
      <section id="capabilities" className="py-24 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: '01', title: 'Controlled state transitions', desc: 'Strict enforcement of allowed state changes.' },
              { id: '02', title: 'Workflow instances', desc: 'Isolate execution contexts for each workflow run.' },
              { id: '03', title: 'Execution history', desc: 'Immutable log of all state changes.' },
              { id: '04', title: 'Audit events', desc: 'Traceable history for compliance and debugging.' },
              { id: '05', title: 'Organization isolation', desc: 'Multi-tenant architecture built-in.' },
              { id: '06', title: 'Role-based authorization', desc: 'Granular permissions based on organization roles.' },
              { id: '07', title: 'Optimistic concurrency', desc: 'Prevent race conditions in distributed execution.' },
              { id: '08', title: 'Typed backend architecture', desc: 'Haskell-powered domain guarantees.' },
            ].map((feature) => (
              <div key={feature.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group">
                <span className="text-primary-500 font-mono text-sm font-bold mb-4 block">{feature.id}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 - INTERACTIVE PRODUCT PREVIEW */}
      <section id="preview" className="py-32 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Workflow execution preview</h2>
            <p className="text-gray-400">A visual demonstration of controlled transitions.</p>
          </div>
          <div className="rounded-3xl bg-white/[0.02] border border-white/10 p-8 backdrop-blur-xl shadow-2xl relative">
            <div className="h-[450px] w-full relative flex items-center justify-center">
               <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                 <line x1="50%" y1="15%" x2="50%" y2="40%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                 <line x1="50%" y1="45%" x2="50%" y2="70%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" />
                 <line x1="50%" y1="75%" x2="35%" y2="90%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                 <line x1="50%" y1="75%" x2="65%" y2="90%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
               </svg>
               <div className="flex flex-col items-center h-full w-full z-10 relative">
                 <div className="absolute top-[10%] px-6 py-3 rounded-lg bg-gray-900 border border-white/20 shadow-lg flex items-center gap-3 w-64">
                   <div className="w-8 h-8 rounded bg-primary-500/20 flex items-center justify-center text-primary-400">⚡</div>
                   <div><div className="text-sm font-semibold">Trigger Event</div><div className="text-xs text-gray-400 font-mono">on_document_upload</div></div>
                 </div>
                 <div className="absolute top-[40%] px-6 py-3 rounded-lg bg-gray-900 border border-primary-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-3 w-64">
                   <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">🧠</div>
                   <div><div className="text-sm font-semibold">AI Analysis</div><div className="text-xs text-gray-400 font-mono">extract_metadata</div></div>
                 </div>
                 <div className="absolute top-[70%] px-6 py-3 rounded-lg bg-gray-900 border border-white/20 shadow-lg flex items-center gap-3 w-64">
                   <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-gray-400">?</div>
                   <div><div className="text-sm font-semibold">Decision</div><div className="text-xs text-gray-400 font-mono">needs_review</div></div>
                 </div>
                 <div className="absolute top-[90%] left-[20%] lg:left-[30%] px-4 py-2 rounded-lg bg-gray-900 border border-green-500/30 flex items-center gap-2">
                   <div className="text-sm font-semibold text-green-400">Approved</div>
                 </div>
                 <div className="absolute top-[90%] right-[20%] lg:right-[30%] px-4 py-2 rounded-lg bg-gray-900 border border-yellow-500/30 flex items-center gap-2">
                   <div className="text-sm font-semibold text-yellow-400">Review</div>
                 </div>
               </div>

               {/* Simulated Audit Side Panel */}
               <div className="hidden lg:block absolute top-8 right-8 w-64 bg-black/40 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                 <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Recent Audit Event</div>
                 <div className="text-sm mb-1">State Transition</div>
                 <div className="text-xs text-primary-400 font-mono mb-2">Trigger → Analysis</div>
                 <div className="text-xs text-gray-500 flex justify-between">
                   <span>User: admin</span>
                   <span>Just now</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 & 7 - ARCHITECTURE & SECURITY */}
      <section id="architecture" className="py-24 bg-[#050505] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl font-bold mb-8">Technical Architecture</h2>
              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg"><span className="text-blue-400">Frontend</span> React / TypeScript / Vite</div>
                <div className="flex justify-center"><div className="w-px h-4 bg-white/20"></div></div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg"><span className="text-green-400">API</span> REST / JSON</div>
                <div className="flex justify-center"><div className="w-px h-4 bg-white/20"></div></div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg"><span className="text-indigo-400">Application</span> Haskell / Servant</div>
                <div className="flex justify-center"><div className="w-px h-4 bg-white/20"></div></div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg"><span className="text-purple-400">Domain</span> Pure State Machine</div>
                <div className="flex justify-center"><div className="w-px h-4 bg-white/20"></div></div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-lg"><span className="text-gray-400">Persistence</span> PostgreSQL / UUIDv4</div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-8">Security & Control</h2>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tenant Isolation</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Organization-aware data access. Workflows and instances are securely isolated within organizational boundaries.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Role-based Permissions</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">Granular authorization mapped to organization roles (Admin, Manager, Member, Viewer) checked at the application boundary.</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cryptographic Identity</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">JWT-based authentication with bcrypt password hashing. Secure token verification on every protected request.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 - DEVELOPER VALUE */}
      <section className="py-24 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Built for engineers.</h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-12">
            FlowForge guarantees explicit workflow state, predictable transitions, and auditable execution. Our pure Haskell domain layer cleanly separates business logic from API delivery, ensuring your orchestration is robust and fully tested against concurrency edge cases.
          </p>
        </div>
      </section>

      {/* SECTION 10 - FINAL CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Build workflows you can reason about.</h2>
          <p className="text-xl text-gray-400 mb-10">Define the workflow. Control its execution. Understand what happened.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Try FlowForge
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-transparent text-white font-semibold hover:bg-white/5 transition-all">
              Sign in to account
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 11 - FOOTER */}
      <footer className="border-t border-white/5 py-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <div className="w-2 h-2 rounded-sm bg-white"></div>
            </div>
            <span className="font-semibold text-gray-300">FlowForge</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex gap-4">
              <span className="text-white font-medium mr-2">Product</span>
              <a href="#problem" className="hover:text-white transition-colors">The Gap</a>
              <a href="#preview" className="hover:text-white transition-colors">Preview</a>
            </div>
            <div className="flex gap-4">
              <span className="text-white font-medium mr-2">Auth</span>
              <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
              <Link to="/register" className="hover:text-white transition-colors">Create account</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
