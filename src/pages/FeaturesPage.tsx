import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Zap,
  Brain,
  BarChart3,
  Users,
  Shield,
  Clock,
  FileCheck,
  Lightbulb,
  Star,
  ArrowRight,
  LineChart,
  BookOpen,
  Gauge,
  Lock,
  Award,
  CheckCircle,
  Maximize2,
  Sparkles,
  Code
} from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const featureSectionRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<(HTMLDivElement | null)[]>([]);
  const featureShowcaseRef = useRef<HTMLDivElement>(null);

  // Feature details for the main showcase
  const featureShowcases = [
    {
      id: 'ai-feedback',
      title: 'Advanced AI Feedback',
      description: 'Generate comprehensive, context-aware feedback that captures your personal grading style and tone. Our proprietary AI models understand the nuance of each submission.',
      icon: <Brain className="h-8 w-8 text-indigo-300" />,
      image: '/assets/images/Moodle Grader teaching.png.webp',
      bulletPoints: [
        'Personalized feedback in your unique voice and tone',
        'Contextual understanding of subject matter',
        'Adaptive learning that improves with your corrections',
        'Multi-language support for global education'
      ]
    },
    {
      id: 'time-saving',
      title: 'Save 70% of Grading Time',
      description: 'Process an entire class worth of assignments in minutes instead of hours. Our benchmarks show an average time savings of 70% compared to traditional manual grading.',
      icon: <Clock className="h-8 w-8 text-indigo-300" />,
      image: '/assets/images/Moodle Grader before pic.png.webp',
      bulletPoints: [
        'Batch processing of multiple assignments',
        'Intelligent student submission grouping',
        'Automatic grade calculation based on rubrics',
        'Priority queue for urgent submissions'
      ]
    },
    {
      id: 'analytics',
      title: 'Comprehensive Analytics',
      description: 'Gain deep insights into student performance, identify knowledge gaps, and track progress over time with our powerful analytics dashboard.',
      icon: <BarChart3 className="h-8 w-8 text-indigo-300" />,
      image: '/assets/images/Moodle Grader research final.png',
      bulletPoints: [
        'Class-wide performance visualization',
        'Individual student progress tracking',
        'Concept mastery heat maps',
        'Exportable data for institutional reporting'
      ]
    },
    {
      id: 'security',
      title: 'Enterprise-Grade Security',
      description: "Rest easy knowing your students' data is protected with our SOC 2 compliant, end-to-end encrypted platform designed specifically for educational institutions.",
      icon: <Shield className="h-8 w-8 text-indigo-300" />,
      image: '/assets/images/Moodle Grader final.png.webp',
      bulletPoints: [
        'FERPA compliant data handling',
        'End-to-end encryption',
        'SOC 2 Type II certification',
        'Regular security audits and penetration testing'
      ]
    },
    {
      id: 'integration',
      title: 'Seamless Integration',
      description: 'Connect Moodle Grader with your existing LMS and workflows. Our platform works with all major Learning Management Systems and supports multiple file formats.',
      icon: <Maximize2 className="h-8 w-8 text-indigo-300" />,
      image: '/assets/images/Moodle Grader Connection.png',
      bulletPoints: [
        'Direct LMS integration with single sign-on',
        'Support for all document formats including PDF, DOCX, TXT',
        'Moodle-compatible CSV import/export',
        'API access for custom integrations'
      ]
    },
    {
      id: 'custom-models',
      title: 'Custom AI Models',
      description: 'Enterprise plans include custom AI models trained specifically for your department, subject matter, and grading preferences for unmatched accuracy.',
      icon: <Sparkles className="h-8 w-8 text-indigo-300" />,
      image: '/assets/images/Moodle grader after.png.webp',
      bulletPoints: [
        'Domain-specific AI model training',
        'Customized rubric adaptation',
        'Department-wide grading consistency',
        'Continuous model improvement and refinement'
      ]
    }
  ];

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Scroll progress bar
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

    // Header parallax effect
    gsap.to(".features-header-content", {
      y: -80,
      ease: "none",
      scrollTrigger: {
        trigger: ".features-header",
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    // Feature highlights animation
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          y: 60,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: index * 0.1,
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          }
        }
      );
    });

    // Testimonial cards animation
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    testimonialCards.forEach((card, index) => {
      gsap.fromTo(
        card,
        { 
          y: 40, 
          opacity: 0 
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          delay: index * 0.15,
          scrollTrigger: {
            trigger: card,
            start: "top 90%"
          }
        }
      );
    });

    // Feature showcase animation
    gsap.fromTo(
      '.feature-image-container',
      {
        scale: 0.9,
        opacity: 0,
      },
      {
        scale: 1,
        opacity: 1,
        duration: 1,
        scrollTrigger: {
          trigger: '.feature-showcase',
          start: "top 70%",
        }
      }
    );

    // Feature tabs animation when coming into view
    gsap.fromTo(
      '.feature-tabs',
      {
        y: 40,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        scrollTrigger: {
          trigger: '.feature-tabs',
          start: "top 85%",
        }
      }
    );

    // Sticky scrolling for feature showcase section
    if (featureSectionRef.current) {
      ScrollTrigger.create({
        trigger: featureSectionRef.current,
        start: "top 15%",
        end: "bottom 85%",
        onUpdate: (self) => {
          // Calculate which feature should be active based on scroll position
          const progress = self.progress;
          const featureCount = featureShowcases.length;
          const newActiveFeature = Math.min(
            Math.floor(progress * featureCount),
            featureCount - 1
          );
          
          if (newActiveFeature !== activeFeature) {
            setActiveFeature(newActiveFeature);
          }
        }
      });
    }

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [activeFeature]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-slate-900 text-white" ref={scrollRef}>
      {/* Scroll progress indicator */}
      <div className="scroll-progress-bar fixed top-0 left-0 h-1 bg-gradient-to-r from-blue-400 to-purple-600 z-50"></div>

      {/* Header */}
      <header className="relative min-h-[90vh] overflow-hidden flex items-center features-header">
        {/* Glowing orbs */}
        <div className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-blue-600 rounded-full opacity-20 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600 rounded-full opacity-20 blur-[100px] pointer-events-none"></div>
        
        <div className="absolute inset-0 bg-[url('/MoodleGraderBackground.png')] bg-cover bg-center opacity-40"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
        
        <div className="container mx-auto px-4 relative z-10 features-header-content">
          <nav className="relative flex items-center justify-between py-8 w-full max-w-7xl mx-auto">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <img 
                  className="h-10 w-auto" 
                  src="/MoodleGraderLogo.png" 
                  alt="Moodle Grader" 
                />
                <span className="ml-2 text-xl font-bold text-white">Moodle Grader</span>
              </Link>
            </div>
            <div className="hidden md:flex md:space-x-8">
              <Link to="/features" className="font-medium text-indigo-300 hover:text-indigo-200 transition">Features</Link>
              <Link to="/pricing" className="font-medium text-white hover:text-indigo-200 transition">Pricing</Link>
              <Link to="/contact" className="font-medium text-white hover:text-indigo-200 transition">Contact</Link>
              <Link to="/login" className="font-medium text-white hover:text-indigo-200 transition px-4 py-2 border border-white/30 rounded-md bg-white/10 hover:bg-white/20">
                Sign in
              </Link>
            </div>
          </nav>

          <div className="max-w-4xl mx-auto text-center mt-24 mb-16">
            <div className="inline-block mb-4 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-500/30">
              <span className="text-sm font-medium text-indigo-200">AI-powered grading platform</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
              Features that transform<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">the grading experience.</span>
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
              Discover how Moodle Grader combines cutting-edge AI with intuitive design to revolutionize the way educators provide feedback.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/app">
                <Button
                  size="lg"
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-indigo-500/20"
                >
                  Try it Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3 border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Feature highlights grid */}
      <section className="relative z-10 -mt-20 mb-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <div className="feature-card bg-gradient-to-br from-indigo-700/30 via-indigo-600/20 to-indigo-900/30 backdrop-blur-xl border border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20 p-8">
              <div className="w-14 h-14 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-indigo-300" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Accelerated Grading</h3>
              <p className="text-slate-300 mb-4">Grade an entire class in minutes rather than hours, with AI that processes assignments at unprecedented speed.</p>
              <div className="flex items-center text-indigo-300 font-medium">
                <span>Learn more</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>

            <div className="feature-card bg-gradient-to-br from-blue-700/30 via-blue-600/20 to-blue-900/30 backdrop-blur-xl border border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20 p-8">
              <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center mb-6">
                <Brain className="h-7 w-7 text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Intelligent Feedback</h3>
              <p className="text-slate-300 mb-4">Provide detailed, contextual feedback that adapts to your personal style and captures your unique teaching voice.</p>
              <div className="flex items-center text-blue-300 font-medium">
                <span>Learn more</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>

            <div className="feature-card bg-gradient-to-br from-purple-700/30 via-purple-600/20 to-purple-900/30 backdrop-blur-xl border border-purple-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/20 p-8">
              <div className="w-14 h-14 rounded-xl bg-purple-600/20 flex items-center justify-center mb-6">
                <LineChart className="h-7 w-7 text-purple-300" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Insightful Analytics</h3>
              <p className="text-slate-300 mb-4">Track student progress, identify trends, and generate comprehensive reports with our powerful analytics dashboard.</p>
              <div className="flex items-center text-purple-300 font-medium">
                <span>Learn more</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>

            <div className="feature-card bg-gradient-to-br from-indigo-700/30 via-indigo-600/20 to-indigo-900/30 backdrop-blur-xl border border-indigo-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20 p-8">
              <div className="w-14 h-14 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-6">
                <Lock className="h-7 w-7 text-indigo-300" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Enterprise Security</h3>
              <p className="text-slate-300 mb-4">Protect sensitive student data with our FERPA-compliant platform featuring end-to-end encryption and SOC 2 certification.</p>
              <div className="flex items-center text-indigo-300 font-medium">
                <span>Learn more</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>

            <div className="feature-card bg-gradient-to-br from-blue-700/30 via-blue-600/20 to-blue-900/30 backdrop-blur-xl border border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20 p-8">
              <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center mb-6">
                <Maximize2 className="h-7 w-7 text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Seamless Integration</h3>
              <p className="text-slate-300 mb-4">Connect with your existing LMS through our flexible API, direct integrations, or simple CSV import/export functionality.</p>
              <div className="flex items-center text-blue-300 font-medium">
                <span>Learn more</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>

            <div className="feature-card bg-gradient-to-br from-purple-700/30 via-purple-600/20 to-purple-900/30 backdrop-blur-xl border border-purple-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/20 p-8">
              <div className="w-14 h-14 rounded-xl bg-purple-600/20 flex items-center justify-center mb-6">
                <Sparkles className="h-7 w-7 text-purple-300" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Custom AI Models</h3>
              <p className="text-slate-300 mb-4">Access domain-specific AI models trained for your subject area, ensuring accurate assessment across specialized disciplines.</p>
              <div className="flex items-center text-purple-300 font-medium">
                <span>Learn more</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive feature showcase */}
      <section ref={featureSectionRef} className="py-24 bg-gradient-to-b from-slate-900 to-indigo-950 relative z-10 min-h-[150vh]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Powerful Features</h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
              Discover the innovative technology that makes Moodle Grader the leading choice for educators worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Feature tabs */}
            <div className="feature-tabs space-y-5">
              {featureShowcases.map((feature, index) => (
                <div 
                  key={feature.id} 
                  ref={(el) => featuresRef.current[index] = el}
                  className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                    activeFeature === index 
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30' 
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <div className="flex items-start">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-5 ${
                      activeFeature === index 
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                        : 'bg-slate-800'
                    }`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold mb-2 ${
                        activeFeature === index ? 'text-white' : 'text-slate-300'
                      }`}>
                        {feature.title}
                      </h3>
                      <p className={`${
                        activeFeature === index ? 'text-indigo-100' : 'text-slate-400'
                      }`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature image */}
            <div className="feature-image-container relative h-[500px] overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/50 to-slate-900/50 backdrop-blur-lg shadow-2xl">
              {featureShowcases.map((feature, index) => (
                <div
                  key={feature.id}
                  className={`absolute inset-0 transition-opacity duration-500 flex flex-col ${
                    activeFeature === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="relative h-3/5 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" style={{ opacity: 0.4 }}></div>
                    <img 
                      src={feature.image} 
                      alt={feature.title} 
                      className="w-full h-full object-cover object-center" 
                    />
                  </div>
                  <div className="p-8 bg-gradient-to-br from-indigo-900/80 to-slate-900/80 h-2/5">
                    <h4 className="text-xl font-bold mb-4">{feature.title}</h4>
                    <ul className="space-y-2">
                      {feature.bulletPoints.map((point, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-indigo-400 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-200">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Statistics section */}
      <section className="py-24 bg-gradient-to-b from-indigo-950 to-slate-900 relative">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.07]"></div>
        
        {/* Glowing orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-6">Transforming Education</h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
              Moodle Grader is revolutionizing how educators provide feedback and assess student work.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-3">70%</div>
              <p className="text-xl text-indigo-100">Time Saved</p>
              <p className="text-slate-400 mt-2">Compared to manual grading methods</p>
            </div>
            
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-3">10M+</div>
              <p className="text-xl text-indigo-100">Assignments Graded</p>
              <p className="text-slate-400 mt-2">Across global educational institutions</p>
            </div>
            
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-3">94%</div>
              <p className="text-xl text-indigo-100">Educator Satisfaction</p>
              <p className="text-slate-400 mt-2">Based on verified user reviews</p>
            </div>
            
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-blue-400 mb-3">500+</div>
              <p className="text-xl text-indigo-100">Institutions</p>
              <p className="text-slate-400 mt-2">From K-12 to top universities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gradient-to-b from-slate-900 to-indigo-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">What Educators Are Saying</h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
              Join thousands of satisfied educators who have transformed their grading process.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="testimonial-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 relative">
              <div className="absolute -top-4 -right-4 text-6xl text-indigo-500/20 font-serif">"</div>
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl mr-4">MA</div>
                <div>
                  <h4 className="text-xl font-bold">Dr. Michael Anderson</h4>
                  <p className="text-indigo-300">Harvard University</p>
                </div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed mb-6">
                "What impressed me most is how the AI captures my exact grading style and tone. My students receive consistent, high-quality feedback that genuinely helps them improve."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
            </div>
            
            <div className="testimonial-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 relative">
              <div className="absolute -top-4 -right-4 text-6xl text-indigo-500/20 font-serif">"</div>
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl mr-4">SR</div>
                <div>
                  <h4 className="text-xl font-bold">Dr. Sarah Rodriguez</h4>
                  <p className="text-indigo-300">Stanford Medical School</p>
                </div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed mb-6">
                "The time savings are extraordinary. I've reclaimed my weekends while actually providing more detailed feedback than I was able to before. It's been truly transformative."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
            </div>
            
            <div className="testimonial-card bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-xl p-8 border border-slate-700/40 relative">
              <div className="absolute -top-4 -right-4 text-6xl text-indigo-500/20 font-serif">"</div>
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-900 font-bold text-xl mr-4">JT</div>
                <div>
                  <h4 className="text-xl font-bold">James Thompson</h4>
                  <p className="text-indigo-300">Princeton University</p>
                </div>
              </div>
              <p className="text-slate-200 text-lg leading-relaxed mb-6">
                "The analytics dashboard has given me unprecedented insights into student performance. I can now identify struggling students and address knowledge gaps proactively."
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Workflow illustration */}
      <section className="py-24 bg-gradient-to-b from-indigo-950 to-slate-900 relative">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.07]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-6">How Moodle Grader Works</h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
              A simplified look at our powerful AI-driven grading workflow.
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[1px] h-[calc(100%-80px)] bg-gradient-to-b from-blue-500 to-purple-500"></div>
              
              {/* Steps */}
              <div className="grid grid-cols-1 gap-24">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
                    <div className="relative z-10 bg-gradient-to-br from-indigo-700/30 via-indigo-600/20 to-indigo-900/30 backdrop-blur-xl border border-indigo-500/50 rounded-2xl p-8 md:p-10 shadow-xl">
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                        <span className="text-white font-bold">1</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-4">Upload Assignments</h3>
                      <p className="text-slate-300 mb-6">
                        Upload student submissions from your Moodle export, or via direct LMS integration. Supports PDFs, Word documents, text files, code, and more.
                      </p>
                      <div className="flex items-center justify-center p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <img src="/upload-illustration.svg" alt="Upload" className="h-20" />
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-gradient-to-br from-blue-700/30 via-blue-600/20 to-blue-900/30 backdrop-blur-xl border border-blue-500/50 rounded-2xl p-8 md:p-10 shadow-xl">
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold">2</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-4">Configure Grading Parameters</h3>
                      <p className="text-slate-300 mb-6">
                        Set up your grading rubric, feedback style, and assessment criteria. Our AI adapts to match your unique grading approach and tone.
                      </p>
                      <div className="flex items-center justify-center p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <img src="/config-illustration.svg" alt="Configure" className="h-20" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center">
                  <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
                    <div className="bg-gradient-to-br from-purple-700/30 via-purple-600/20 to-purple-900/30 backdrop-blur-xl border border-purple-500/50 rounded-2xl p-8 md:p-10 shadow-xl">
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold">3</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-4">AI Processes Assignments</h3>
                      <p className="text-slate-300 mb-6">
                        Our advanced AI analyzes each submission, understanding context and content. It generates personalized feedback and suggested grades based on your rubric.
                      </p>
                      <div className="flex items-center justify-center p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <Brain className="h-20 w-20 text-purple-300" />
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12">
                    <div className="bg-gradient-to-br from-indigo-700/30 via-indigo-600/20 to-indigo-900/30 backdrop-blur-xl border border-indigo-500/50 rounded-2xl p-8 md:p-10 shadow-xl">
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold">4</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-4">Review and Refine</h3>
                      <p className="text-slate-300 mb-6">
                        Review AI-generated feedback and grades, make adjustments as needed, and finalize assessments. Our system learns from your edits to improve future results.
                      </p>
                      <div className="flex items-center justify-center p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <FileCheck className="h-20 w-20 text-indigo-300" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-center">
                  <div className="md:w-1/2 mb-8 md:mb-0 md:pr-12">
                    <div className="bg-gradient-to-br from-blue-700/30 via-blue-600/20 to-blue-900/30 backdrop-blur-xl border border-blue-500/50 rounded-2xl p-8 md:p-10 shadow-xl">
                      <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                        <span className="text-white font-bold">5</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-4">Export and Analyze</h3>
                      <p className="text-slate-300 mb-6">
                        Export grades and feedback directly to your LMS or as a CSV file. Access detailed analytics on student performance and trends across assignments.
                      </p>
                      <div className="flex items-center justify-center p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <img src="/export-illustration.svg" alt="Export" className="h-20" />
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2 md:pl-12 flex justify-center">
                    <div className="inline-flex">
                      <Link to="/app">
                        <Button
                          size="lg"
                          className="px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-indigo-500/20 text-lg"
                        >
                          Start Using Moodle Grader <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/MoodleGraderBackground.png')] bg-cover bg-center opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 to-slate-900/90" />
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        </div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600 rounded-full opacity-20 blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full opacity-20 blur-[120px]"></div>
        
        <div className="relative container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
              Ready to reclaim your time?
            </h2>
            <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
              Join thousands of educators who have transformed their grading process with Moodle Grader.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/app">
                <Button size="lg" className="px-8 py-6 text-lg font-medium bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-indigo-500/20">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-medium border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300">
                  View Pricing
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
                <img className="h-10 w-auto" src="/MoodleGraderLogo.png" alt="Moodle Grader" />
                <span className="ml-3 text-xl font-bold">Moodle Grader</span>
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
              &copy; {new Date().getFullYear()} Moodle Grader. All rights reserved.
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

export default FeaturesPage;