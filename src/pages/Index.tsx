
import { Hero } from "@/components/Hero";
import { ProblemSolution } from "@/components/ProblemSolution";
import { Features } from "@/components/Features";
import { PopupDemo } from "@/components/PopupDemo";
import { SocialProof } from "@/components/SocialProof";
import { Pricing } from "@/components/Pricing";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Hero />
      <ProblemSolution />
      <Features />
      <PopupDemo />
      <SocialProof />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
