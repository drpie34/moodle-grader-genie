import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  Zap,
  LineChart,
  Users,
  Lock,
  BookOpen,
  StarIcon
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const PricingPage: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const pricingCardsRef = useRef<HTMLDivElement>(null);
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Progress bar animation
    gsap.to('.scroll-progress-bar', {
      width: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3
      }
    });

    // Parallax effect on the header
    gsap.to(".pricing-header-content", {
      y: -80,
      ease: "none",
      scrollTrigger: {
        trigger: headerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    // Animate pricing cards on scroll
    const cards = document.querySelectorAll('.pricing-card');
    cards.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          y: 60,
          opacity: 0,
          scale: 0.95
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          delay: index * 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: pricingCardsRef.current,
            start: "top 70%"
          }
        }
      );
    });

    // Animate feature items with stagger
    const featureItems = document.querySelectorAll('.feature-item');
    gsap.fromTo(
      featureItems,
      {
        y: 30,
        opacity: 0
      },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section1Ref.current,
          start: "top 70%"
        }
      }
    );

    // Animate testimonials
    const testimonials = document.querySelectorAll('.testimonial-card');
    testimonials.forEach((testimonial, index) => {
      gsap.fromTo(
        testimonial,
        {
          x: index % 2 === 0 ? -50 : 50,
          opacity: 0
        },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: testimonial,
            start: "top 85%"
          }
        }
      );
    });

    // Animate FAQ items
    const faqItems = document.querySelectorAll('.faq-item');
    gsap.fromTo(
      faqItems,
      {
        y: 20,
        opacity: 0
      },
      {
        y: 0,
        opacity: 1,
        stagger: 0.1,
        duration: 0.5,
        ease: "power1.out",
        scrollTrigger: {
          trigger: faqRef.current,
          start: "top 80%"
        }
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-slate-900 text-white">
      {/* Scroll progress indicator */}
      <div className="scroll-progress-bar fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-purple-600 z-50"></div>

      {/* Background grid */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.15] pointer-events-none"></div>

      {/* Header */}
      <header ref={headerRef} className="relative min-h-[70vh] overflow-hidden flex items-center">
        {/* Glowing orbs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-600 rounded-full opacity-20 blur-[100px]"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-purple-600 rounded-full opacity-20 blur-[100px]"></div>
        
        <div className="absolute inset-0 bg-[url('/MoodleGraderBackground.png.webp')] bg-cover bg-center opacity-40"></div>
        
        <div className="container mx-auto px-4 relative z-10 pricing-header-content">
          <nav className="relative flex items-center justify-between py-8 w-full max-w-7xl mx-auto">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img 
                  className="h-10 w-auto sm:h-8" 
                  src="/MoodleGraderLogo.png" 
                  alt="MoodleGrader" 
                />
                <span className="ml-2 text-xl font-bold text-white">MoodleGrader</span>
              </Link>
            </div>
            <div className="hidden md:flex md:space-x-8">
              <Link to="/features" className="font-medium text-white hover:text-indigo-200 transition">Features</Link>
              <Link to="/pricing" className="font-medium text-indigo-300 hover:text-indigo-200 transition">Pricing</Link>
              <Link to="/contact" className="font-medium text-white hover:text-indigo-200 transition">Contact</Link>
              <Link to="/login" className="font-medium text-white hover:text-indigo-200 transition px-4 py-2 border border-white/30 rounded-md bg-white/10 hover:bg-white/20">
                Sign in
              </Link>
            </div>
          </nav>

          <div className="max-w-4xl mx-auto text-center mt-20 mb-16">
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-500/30">
              <span className="text-sm font-medium text-indigo-200">Enterprise-grade solutions for educators</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
              Transparent pricing.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">For every academic need.</span>
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
              Choose the perfect plan for your institution. No hidden fees. Cancel anytime.
            </p>
          </div>
        </div>
      </header>
      
      {/* Pricing section */}
      <section ref={pricingCardsRef} className="relative py-20 -mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:space-x-8 space-y-10 md:space-y-0 max-w-6xl mx-auto">
            {/* Starter plan */}
            <div className="pricing-card flex-1 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="p-8">
                <div className="text-indigo-400 font-semibold mb-3 uppercase tracking-wider text-sm">Starter</div>
                <h3 className="text-3xl font-bold mb-6">Free</h3>
                <p className="text-slate-300 mb-6">Perfect for individual educators trying out MoodleGrader.</p>
                
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Grade up to 100 assignments per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Basic AI-powered feedback</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Moodle CSV import/export</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Email support</span>
                  </li>
                </ul>
                
                <Link to="/signup?plan=free">
                  <Button variant="outline" size="lg" className="w-full border-indigo-500/50 text-indigo-200 hover:bg-indigo-600/20">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Pro plan */}
            <div className="pricing-card flex-1 relative bg-gradient-to-br from-indigo-700/30 via-indigo-600/20 to-indigo-900/30 backdrop-blur-xl border border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20 scale-105 z-10">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-purple-500"></div>
              <div className="absolute -top-3 right-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full transform rotate-2">Most Popular</div>
              <div className="p-8">
                <div className="text-indigo-300 font-semibold mb-3 uppercase tracking-wider text-sm">Pro</div>
                <div className="flex items-baseline">
                  <h3 className="text-3xl font-bold">$29</h3>
                  <span className="text-indigo-200 ml-2">/month</span>
                </div>
                <p className="text-slate-200 mt-2 mb-6">Ideal for educators who want enhanced features and more capacity.</p>
                
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-300 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Unlimited assignments</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-300 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Advanced AI feedback with personalization</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-300 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Custom grading rubric templates</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-300 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Priority email support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-300 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Analytics dashboard</span>
                  </li>
                </ul>
                
                <Link to="/signup?plan=pro">
                  <Button size="lg" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0">
                    Start 14-day Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Enterprise plan */}
            <div className="pricing-card flex-1 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="p-8">
                <div className="text-indigo-400 font-semibold mb-3 uppercase tracking-wider text-sm">Enterprise</div>
                <h3 className="text-3xl font-bold mb-2">Custom</h3>
                <p className="text-slate-300 mb-6">For institutions needing advanced features and dedicated support.</p>
                
                <ul className="space-y-4 mb-10">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Everything in Pro plan</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">LMS integration with SSO</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Custom AI model training</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">Dedicated customer success manager</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-200">SLA & priority support</span>
                  </li>
                </ul>
                
                <Link to="/contact?enterprise=true">
                  <Button variant="outline" size="lg" className="w-full border-indigo-500/50 text-indigo-200 hover:bg-indigo-600/20">
                    Contact Sales <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Plan comparison table for larger screens */}
      <section className="relative py-20 hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Compare Plans</h2>
            
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left p-5 text-lg font-semibold text-white">Features</th>
                    <th className="p-5 text-center text-lg font-semibold text-indigo-300">Starter</th>
                    <th className="p-5 text-center text-lg font-semibold bg-indigo-900/30 text-indigo-200">Pro</th>
                    <th className="p-5 text-center text-lg font-semibold text-indigo-300">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/30">
                    <td className="p-5 text-slate-200">Monthly assignments</td>
                    <td className="p-5 text-center text-slate-300">100</td>
                    <td className="p-5 text-center bg-indigo-900/20 text-indigo-100">Unlimited</td>
                    <td className="p-5 text-center text-slate-300">Unlimited</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="p-5 text-slate-200">AI feedback quality</td>
                    <td className="p-5 text-center text-slate-300">Basic</td>
                    <td className="p-5 text-center bg-indigo-900/20 text-indigo-100">Advanced</td>
                    <td className="p-5 text-center text-slate-300">Custom trained</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="p-5 text-slate-200">Turnaround time</td>
                    <td className="p-5 text-center text-slate-300">Standard</td>
                    <td className="p-5 text-center bg-indigo-900/20 text-indigo-100">Priority</td>
                    <td className="p-5 text-center text-slate-300">SLA guaranteed</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="p-5 text-slate-200">Analytics & insights</td>
                    <td className="p-5 text-center text-slate-300">
                      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/50">
                        <span className="text-slate-300">–</span>
                      </div>
                    </td>
                    <td className="p-5 text-center bg-indigo-900/20">
                      <CheckCircle2 className="h-6 w-6 text-indigo-400 mx-auto" />
                    </td>
                    <td className="p-5 text-center">
                      <CheckCircle2 className="h-6 w-6 text-indigo-400 mx-auto" />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="p-5 text-slate-200">Custom grading rubrics</td>
                    <td className="p-5 text-center text-slate-300">3</td>
                    <td className="p-5 text-center bg-indigo-900/20 text-indigo-100">Unlimited</td>
                    <td className="p-5 text-center text-slate-300">Unlimited + Custom</td>
                  </tr>
                  <tr className="border-b border-slate-700/30">
                    <td className="p-5 text-slate-200">LMS integration</td>
                    <td className="p-5 text-center text-slate-300">CSV only</td>
                    <td className="p-5 text-center bg-indigo-900/20 text-indigo-100">CSV + API</td>
                    <td className="p-5 text-center text-slate-300">Full SSO + API</td>
                  </tr>
                  <tr>
                    <td className="p-5 text-slate-200">Support</td>
                    <td className="p-5 text-center text-slate-300">Email</td>
                    <td className="p-5 text-center bg-indigo-900/20 text-indigo-100">Priority email</td>
                    <td className="p-5 text-center text-slate-300">Dedicated manager</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      
      {/* Key features */}
      <section ref={section1Ref} className="relative py-24 bg-gradient-to-b from-slate-900 to-indigo-950">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">What makes MoodleGrader different?</h2>
            <p className="text-xl text-indigo-100">
              Our platform is designed specifically for the needs of educators and academic institutions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="feature-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Enterprise-grade security</h3>
              <p className="text-slate-300">FERPA compliant with SOC 2 certification and end-to-end encryption for all student data.</p>
            </div>
            
            <div className="feature-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Lightning-fast processing</h3>
              <p className="text-slate-300">Grade an entire class of assignments in minutes, not hours. 70% time savings on average.</p>
            </div>
            
            <div className="feature-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-6">
                <LineChart className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Insightful analytics</h3>
              <p className="text-slate-300">Track performance trends, identify learning gaps, and generate comprehensive reports.</p>
            </div>
            
            <div className="feature-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Team collaboration</h3>
              <p className="text-slate-300">Perfect for teaching teams with shared assignments, rubrics, and feedback templates.</p>
            </div>
            
            <div className="feature-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-6">
                <Lock className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Privacy first</h3>
              <p className="text-slate-300">Your data stays yours. We never train our models on your students' work or personal information.</p>
            </div>
            
            <div className="feature-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 hover:border-indigo-500/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-6">
                <BookOpen className="h-6 w-6 text-indigo-300" />
              </div>
              <h3 className="text-xl font-bold mb-3">Custom learning models</h3>
              <p className="text-slate-300">Enterprise plans include custom AI models trained specifically for your subject area and grading style.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section ref={section2Ref} className="relative py-24 bg-indigo-950">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.07]"></div>
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center mb-20">
            <h2 className="text-4xl font-bold mb-6">Trusted by leading institutions</h2>
            <p className="text-xl text-indigo-100">
              Join thousands of educators who've transformed their grading workflow
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
            <div className="testimonial-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl mr-4">DR</div>
                <div>
                  <h4 className="text-xl font-bold">Dr. Rebecca Chen</h4>
                  <p className="text-indigo-300">Stanford University</p>
                </div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed mb-6">
                "As a computer science professor with over 200 students per semester, MoodleGrader has revolutionized how I provide feedback. The AI understands code submissions in ways I didn't think possible."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                ))}
              </div>
            </div>
            
            <div className="testimonial-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl mr-4">ML</div>
                <div>
                  <h4 className="text-xl font-bold">Dr. Marcus Lee</h4>
                  <p className="text-indigo-300">UCLA Medical School</p>
                </div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed mb-6">
                "The enterprise plan has been transformative for our medical school. The custom AI models understand medical terminology and can provide meaningful feedback on case studies. Well worth the investment."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                ))}
              </div>
            </div>
            
            <div className="testimonial-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl mr-4">SP</div>
                <div>
                  <h4 className="text-xl font-bold">Sarah Parker</h4>
                  <p className="text-indigo-300">Berkeley High School</p>
                </div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed mb-6">
                "Even on the Starter plan, I've reclaimed hours of my week. The feedback is thorough and my students tell me it's actually helping them improve their writing. The Pro plan is next on my list!"
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                ))}
              </div>
            </div>
            
            <div className="testimonial-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl mr-4">JD</div>
                <div>
                  <h4 className="text-xl font-bold">James Davidson</h4>
                  <p className="text-indigo-300">MIT</p>
                </div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed mb-6">
                "We've integrated MoodleGrader across our entire engineering department. The analytics feature gives us unprecedented insights into student progress and areas where our curriculum needs improvement."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* FAQ section */}
      <section ref={faqRef} className="relative py-24 bg-gradient-to-b from-indigo-950 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              <div className="faq-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
                <h3 className="text-xl font-bold mb-4">How secure is MoodleGrader?</h3>
                <p className="text-slate-300">
                  Extremely secure. We're FERPA compliant, SOC 2 certified, and use end-to-end encryption for all data. Your students' information never leaves our secure environment, and we don't train our models on your data.
                </p>
              </div>
              
              <div className="faq-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
                <h3 className="text-xl font-bold mb-4">Can I customize the feedback style?</h3>
                <p className="text-slate-300">
                  Absolutely. All plans allow you to set your preferred feedback style, tone, and format. Pro and Enterprise plans offer advanced customization including the ability to create feedback templates and rubrics tailored to your teaching style.
                </p>
              </div>
              
              <div className="faq-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
                <h3 className="text-xl font-bold mb-4">What file formats are supported?</h3>
                <p className="text-slate-300">
                  MoodleGrader supports a wide range of file formats including PDF, DOCX, TXT, programming files (like .py, .java, .cpp), and can extract text from images. We also support direct Moodle integration through CSV import/export on all plans.
                </p>
              </div>
              
              <div className="faq-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
                <h3 className="text-xl font-bold mb-4">Can I upgrade or downgrade my plan?</h3>
                <p className="text-slate-300">
                  Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades will take effect at the end of your current billing cycle. We provide prorated credits when upgrading mid-cycle.
                </p>
              </div>
              
              <div className="faq-item bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40">
                <h3 className="text-xl font-bold mb-4">Is there a discount for educational institutions?</h3>
                <p className="text-slate-300">
                  Yes, we offer special pricing for K-12 schools, colleges, and universities. Contact our sales team for educational institution discounts and multi-seat licenses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/MoodleGraderBackground.png.webp')] bg-cover bg-center opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-slate-900/90" />
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        </div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600 rounded-full opacity-20 blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full opacity-20 blur-[120px]"></div>
        
        <div className="relative container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Ready to transform how you grade?
            </h2>
            <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
              Join thousands of educators who have reclaimed their time while providing better feedback to their students.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="px-8 py-6 text-lg font-medium bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-indigo-500/20">
                  Start Your Free Trial
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-medium border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-4">
              <div className="flex items-center mb-6">
                <img className="h-10 w-auto" src="/MoodleGraderLogo.png" alt="MoodleGrader" />
                <span className="ml-3 text-xl font-bold">MoodleGrader</span>
              </div>
              <p className="text-slate-300 mb-6">
                AI-powered grading that adapts to your style, saves you time, and provides your students with detailed, meaningful feedback.
              </p>
              <div className="flex space-x-4">
                <Link to="#" className="text-slate-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </Link>
                <Link to="#" className="text-slate-400 hover:text-white transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="md:col-span-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Product</h3>
                  <ul className="space-y-3">
                    <li><Link to="/features" className="text-slate-300 hover:text-white transition-colors">Features</Link></li>
                    <li><Link to="/pricing" className="text-slate-300 hover:text-white transition-colors">Pricing</Link></li>
                    <li><Link to="/demo" className="text-slate-300 hover:text-white transition-colors">Demo</Link></li>
                    <li><Link to="/security" className="text-slate-300 hover:text-white transition-colors">Security</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Company</h3>
                  <ul className="space-y-3">
                    <li><Link to="/about" className="text-slate-300 hover:text-white transition-colors">About</Link></li>
                    <li><Link to="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link></li>
                    <li><Link to="/careers" className="text-slate-300 hover:text-white transition-colors">Careers</Link></li>
                    <li><Link to="/blog" className="text-slate-300 hover:text-white transition-colors">Blog</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Legal</h3>
                  <ul className="space-y-3">
                    <li><Link to="/privacy" className="text-slate-300 hover:text-white transition-colors">Privacy</Link></li>
                    <li><Link to="/terms" className="text-slate-300 hover:text-white transition-colors">Terms</Link></li>
                    <li><Link to="/accessibility" className="text-slate-300 hover:text-white transition-colors">Accessibility</Link></li>
                    <li><Link to="/data-processing" className="text-slate-300 hover:text-white transition-colors">Data Processing</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between">
            <p className="text-slate-400">
              &copy; {new Date().getFullYear()} MoodleGrader. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
              <Link to="/sitemap" className="text-slate-400 hover:text-white transition-colors">Sitemap</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;