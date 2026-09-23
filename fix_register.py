import re

with open('frontend/src/features/auth/RegisterForm.tsx', 'r') as f:
    c = f.read()

# Add isSuccess state
c = c.replace("const [isSubmitting, setIsSubmitting] = useState(false);", "const [isSubmitting, setIsSubmitting] = useState(false);\n  const [isSuccess, setIsSuccess] = useState(false);")

# Update try block
try_block = """    setIsSubmitting(true);
    try {
      await register(email, password);
      setIsSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 2000);
    } catch {"""
c = re.sub(r'setIsSubmitting\(true\);\s*try \{\s*await register\(email, password\);\s*navigate\(from, \{ replace: true \}\);\s*\} catch \{', try_block, c)

# Update return statement to show success state
return_block = """  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-indigo-500 rounded-[2rem] blur-xl opacity-20 pointer-events-none" />
        <div className="relative bg-[#0d0d0d] border border-white/10 p-8 sm:p-10 rounded-[2rem] shadow-2xl backdrop-blur-xl text-center">
          <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">Your workspace is ready.</h2>
          <p className="text-gray-400 mb-8">Let's build your first workflow.</p>
          <div className="animate-pulse flex items-center justify-center text-primary-400 text-sm">
            Redirecting to dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
"""
c = c.replace("  return (\n", return_block)

with open('frontend/src/features/auth/RegisterForm.tsx', 'w') as f:
    f.write(c)

