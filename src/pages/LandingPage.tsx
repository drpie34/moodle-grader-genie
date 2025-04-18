import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSectionInView } from "../hooks/useSectionInView";
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import {
  ArrowRight,
  Clock,
  FileText,
  FileCheck,
  BarChart3,
  CheckCircle,
  Brain,
  Lightbulb,
  Book,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Setup smooth scrolling with GSAP and ScrollTrigger
  useEffect(() => {
    // Register ScrollTrigger and ScrollToPlugin plugins
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    
    // Configure smoother scrolling behavior
    gsap.defaults({
      overwrite: 'auto',
      ease: 'power2.out'
    });
    
    // Add a small delay to ensure DOM is fully ready
    let mm = gsap.matchMedia();
    
    mm.add("(min-width: 800px)", () => {
      // Only apply custom scrolling on desktop
      gsap.to("html", {
        scrollBehavior: "smooth",
        scrollTo: {
          y: "#smooth-content",
          offsetY: 0,
          autoKill: false
        },
        ease: "power2.out"
      });
    });

    // Create a scroll progress indicator
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
    
    // Create animations for each card section
    const cardSections = document.querySelectorAll('.card-content');
    
    cardSections.forEach((card, index) => {
      // Create animation for each card
      const section = document.querySelector(`#section-${index}`);
      if (section) {
        gsap.fromTo(card, 
          { 
            opacity: 0.2,
            scale: 0.95,
            y: 20,
          }, 
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 65%", 
              end: "center center",
              scrub: 0.8,       // Smoother scrubbing for better animation
              toggleActions: "play none none reverse",
              // markers: true,  // Uncomment for debugging
            }
          }
        );
      }
    });
    
    // Set up scroll speed controller and background tracking
    ScrollTrigger.create({
      trigger: "#smooth-content",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        // Control scroll speed here if needed
        document.documentElement.style.setProperty('--scroll-speed', self.getVelocity() * 0.005 + '');
        
        // Backup method: check which section is closest to the center of the screen
        const sections = document.querySelectorAll('.bg-section-container');
        let closestSection = 0;
        let minDistance = Infinity;
        
        // Special case: if at the very top, always show the first background
        if (window.scrollY < 10) {
          const bgSections = document.querySelectorAll('.bg-section');
          bgSections.forEach((bg, idx) => {
            if (bg instanceof HTMLElement) {
              bg.style.opacity = idx === 0 ? "1" : "0";
            }
          });
          return;
        }

        sections.forEach((section, idx) => {
          const rect = section.getBoundingClientRect();
          const sectionCenter = rect.top + rect.height / 2;
          const viewportCenter = window.innerHeight / 2;
          const distance = Math.abs(sectionCenter - viewportCenter);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestSection = idx;
          }
        });
        
        // If we're at least 20% into the sections area, update background
        if (self.progress > 0.2) {
          const bgSections = document.querySelectorAll('.bg-section');
          bgSections.forEach((bg, idx) => {
            if (bg instanceof HTMLElement) {
              bg.style.opacity = idx === closestSection ? "1" : "0";
            }
          });
        }
      },
    });

    // Clean up all ScrollTriggers on unmount
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      gsap.killTweensOf(window);
    };
  }, []);

  return (
    <>
      {/* Scroll progress indicator */}
      <div className="scroll-progress-bar"></div>
      
      <div id="smooth-content" ref={scrollContainerRef} className="flex flex-col min-h-screen smooth-scroll">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/MoodleGraderBackground.png')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-black/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        </div>
        <div className="relative max-w-7xl mx-auto pt-10 pb-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <nav className="relative flex items-center justify-between sm:h-10 w-full max-w-7xl">
            <div className="flex items-center flex-grow flex-shrink-0 lg:flex-grow-0">
              <div className="flex items-center justify-between w-full md:w-auto">
                <Link to="/" className="flex items-center">
                  <img
                    className="h-12 w-auto sm:h-8"
                    src="/MoodleGraderLogo.png"
                    alt="Moodle Grader"
                  />
                  <span className="ml-1 text-2xl font-bold text-white hidden sm:block">Moodle Grader</span>
                </Link>
              </div>
            </div>
            <div className="md:block md:ml-10 md:pr-4 space-x-6">
              <Link to="/features" className="font-medium text-white hover:text-indigo-200">Features</Link>
              <Link to="/pricing" className="font-medium text-white hover:text-indigo-200">Pricing</Link>
              <Link to="/contact" className="font-medium text-white hover:text-indigo-200">Contact</Link>
              <Link to="/login" className="font-medium text-white hover:text-indigo-200 px-4 py-2 border border-transparent rounded-md bg-white bg-opacity-20 hover:bg-opacity-30">
                Sign in
              </Link>
            </div>
          </nav>
          
          <div className="mt-20 max-w-3xl sm:mt-24 text-center">
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl tracking-tight">
              <span className="block">Grade smarter,</span>
              <span className="block">not harder.</span>
            </h1>
            <p className="mt-6 text-xl text-indigo-100 max-w-3xl">
              AI-powered grading that adapts to your style, saves you time, and provides your students with detailed, meaningful feedback.
            </p>
            <div className="mt-10 flex justify-center gap-3">
              <Link to="/app">
                <Button size="lg" className="px-8 py-3 text-base font-medium bg-white text-indigo-700 hover:bg-indigo-50">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" className="px-8 py-3 text-base font-medium bg-white text-indigo-700 hover:bg-indigo-50">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Straight line divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 60" className="w-full h-auto">
            <rect width="1440" height="60" fill="#ffffff" />
          </svg>
        </div>
      </header>

      {/* Section-based Parallax Background */}
      {(() => {
        // Section backgrounds and overlay gradients
        // Fix missing leading slashes in image paths and ensure proper encoding
        const backgrounds = [
          {
            imgSrc: "/assets/images/Moodle%20Grader%20before%20pic.png",
            overlayGradient: "from-indigo-900/80 to-white/10",
          },
          {
            imgSrc: "/assets/images/Moodle%20grader%20after.png",
            overlayGradient: "from-indigo-900/70 to-white/5",
          },
          {
            imgSrc: "/assets/images/Moodle%20Grader%20research%20final.png",
            overlayGradient: "from-indigo-900/80 to-white/10",
          },
          {
            imgSrc: "/assets/images/Moodle%20Grader%20Connection.png",
            overlayGradient: "from-indigo-900/70 to-white/5",
          },
        ];
        const [currentSection, sectionRefs] = useSectionInView(backgrounds.length);
        return (
          <>
            {/* For debugging - log the image paths */}
            {backgrounds.forEach((bg, idx) => {
              console.log(`Background ${idx} path: ${bg.imgSrc}`);
            })}
            
            {/* Fixed background container for fading effect */}
            <div className="fixed inset-0 w-full h-screen -z-10">
              {backgrounds.map((bg, i) => (
                <div 
                  key={i}
                  className="absolute inset-0 w-full h-full bg-section"
                  id={`bg-section-${i}`}
                  style={{
                    backgroundImage: `url(${bg.imgSrc})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: i === 0 ? 1 : 0, // Start with first image visible
                    transition: 'opacity 0.8s ease-in-out'
                  }}
                >
                  {/* Overlay gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${bg.overlayGradient} pointer-events-none`} />
                </div>
              ))}
            </div>

            {/* Scrollable container with sections */}
            <div className="relative">
              {/* Section 1 - Card sticks to middle for a while */}
              <section ref={sectionRefs[0]} className="min-h-[130vh] relative bg-section-container" id="section-0">
                <div className="sticky top-[30vh] h-[60vh] w-full flex items-center justify-center">
                  <div className="w-full max-w-7xl px-6 md:px-20">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.2)] p-10 md:p-16 max-w-2xl mr-auto card-content fade-on-scroll">
                      <h3 className="text-3xl md:text-4xl xl:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600 mb-6 leading-tight">
                        The Dreaded Stack
                      </h3>
                      <p className="text-xl md:text-2xl text-gray-600 font-normal leading-relaxed">
                        Every educator knows the feeling. That towering stack of assignments waiting to be graded, consuming your evenings and weekends.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Section 2 - Card sticks to middle for a while */}
              <section ref={sectionRefs[1]} className="min-h-[130vh] relative bg-section-container" id="section-1">
                <div className="sticky top-[30vh] h-[60vh] w-full flex items-center justify-center">
                  <div className="w-full max-w-7xl px-6 md:px-20">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.2)] p-10 md:p-16 max-w-2xl ml-auto text-right card-content fade-on-scroll">
                      <h3 className="text-3xl md:text-4xl xl:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600 mb-6 leading-tight">
                        A Better Way
                      </h3>
                      <p className="text-xl md:text-2xl text-gray-600 font-normal leading-relaxed">
                        What if there was a better way? A way that maintains complete control and your unique voice?
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Section 3 - Card sticks to middle for a while */}
              <section ref={sectionRefs[2]} className="min-h-[130vh] relative bg-section-container" id="section-2">
                <div className="sticky top-[30vh] h-[60vh] w-full flex items-center justify-center">
                  <div className="w-full max-w-7xl px-6 md:px-20">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.2)] p-10 md:p-16 max-w-2xl mr-auto card-content fade-on-scroll">
                      <h3 className="text-3xl md:text-4xl xl:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600 mb-6 leading-tight">
                        Regain Your Time
                      </h3>
                      <p className="text-xl md:text-2xl text-gray-600 font-normal leading-relaxed">
                        Regain time to pursue your research and academic interests.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Section 4 - Card sticks to middle for a while */}
              <section ref={sectionRefs[3]} className="min-h-[130vh] relative bg-section-container" id="section-3">
                <div className="sticky top-[30vh] h-[60vh] w-full flex items-center justify-center">
                  <div className="w-full max-w-7xl px-6 md:px-20">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-[0_20px_80px_-15px_rgba(0,0,0,0.2)] p-10 md:p-16 max-w-2xl ml-auto text-right card-content fade-on-scroll">
                      <h3 className="text-3xl md:text-4xl xl:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600 mb-6 leading-tight">
                        Deeper Connections
                      </h3>
                      <p className="text-xl md:text-2xl text-gray-600 font-normal leading-relaxed">
                        Build stronger relationships with your students through meaningful, personalized feedback.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              
              {/* Scroll indicator dots */}
              <div className="fixed bottom-8 left-0 right-0 flex flex-col items-center gap-4 z-20">
                <div className="flex justify-center gap-3">
                  {backgrounds.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${
                        currentSection === idx ? 'bg-white scale-150' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-3 text-white/70 text-xs font-medium tracking-wider uppercase">
                  <span className="animate-pulse">Scroll to explore</span>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-5xl tracking-tight">
              Features
            </h2>
            <div className="w-24 h-1 bg-indigo-600 mx-auto mt-6"></div>
            <p className="mt-8 max-w-2xl text-xl text-gray-500 mx-auto">
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white mb-5">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Save Hours of Time</h3>
              <p className="mt-3 text-gray-500">
                Cut your grading time by up to 70%. Grade an entire class's assignments in minutes rather than hours.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white mb-5">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Detailed Feedback</h3>
              <p className="mt-3 text-gray-500">
                Provide students with thorough, thoughtful feedback that focuses on improvement, not just evaluation.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white mb-5">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI-Powered Intelligence</h3>
              <p className="mt-3 text-gray-500">
                Leverages advanced AI to understand each submission's context and provide meaningful, relevant feedback.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white mb-5">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Complete Control</h3>
              <p className="mt-3 text-gray-500">
                Review and edit every grade and comment. The AI suggests, but you maintain full control over the final feedback.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white mb-5">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Personalized Style</h3>
              <p className="mt-3 text-gray-500">
                Matches your unique grading voice and style. Students receive feedback that feels authentically like it came from you.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white mb-5">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Seamless Integration</h3>
              <p className="mt-3 text-gray-500">
                Works directly with Moodle's gradebook format. Import your assignments and export ready-to-upload grades and comments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-5xl tracking-tight">
              Trusted by Educators
            </h2>
            <div className="w-24 h-1 bg-indigo-600 mx-auto mt-6"></div>
            <p className="mt-8 max-w-2xl text-xl text-gray-500 mx-auto">
              Hear from professors and teachers who have transformed their grading experience
            </p>
          </div>

          <div className="mt-20">
            <div className="relative">
              <div className="absolute inset-0 h-1/2 bg-gradient-to-r from-gray-50 to-gray-100"></div>
              <div className="relative mx-auto max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Testimonial 1 */}
                  <div className="bg-white shadow-xl rounded-xl overflow-hidden transform transition-transform hover:scale-105">
                    <div className="px-10 pt-10 pb-8">
                      <div className="flex items-center">
                        <div className="inline-flex flex-shrink-0 rounded-full border-2 border-indigo-500 p-1">
                          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-800 font-bold text-xl">DR</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-xl font-bold text-gray-900">Dr. Rebecca Chen</h4>
                          <p className="text-indigo-600 font-medium">Professor of Computer Science</p>
                        </div>
                      </div>
                      <div className="mt-6">
                        <p className="text-lg text-gray-600 leading-relaxed">
                          "Moodle Grader has revolutionized how I provide feedback to my 200+ students. The AI understands the nuances of programming assignments and generates feedback that's genuinely helpful for student learning."
                        </p>
                      </div>
                    </div>
                    <div className="px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600">
                      <div className="flex items-center justify-between">
                        <div className="flex text-white">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-1">
                              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial 2 */}
                  <div className="bg-white shadow-xl rounded-xl overflow-hidden transform transition-transform hover:scale-105 lg:mt-10">
                    <div className="px-10 pt-10 pb-8">
                      <div className="flex items-center">
                        <div className="inline-flex flex-shrink-0 rounded-full border-2 border-indigo-500 p-1">
                          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-800 font-bold text-xl">JT</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-xl font-bold text-gray-900">James Thompson</h4>
                          <p className="text-indigo-600 font-medium">High School English Teacher</p>
                        </div>
                      </div>
                      <div className="mt-6">
                        <p className="text-lg text-gray-600 leading-relaxed">
                          "I've reclaimed my weekends! What used to take me 6+ hours now takes less than 1. My students are getting more detailed feedback than ever before, and the quality of their revisions has dramatically improved."
                        </p>
                      </div>
                    </div>
                    <div className="px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600">
                      <div className="flex items-center justify-between">
                        <div className="flex text-white">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-1">
                              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial 3 */}
                  <div className="bg-white shadow-xl rounded-xl overflow-hidden transform transition-transform hover:scale-105">
                    <div className="px-10 pt-10 pb-8">
                      <div className="flex items-center">
                        <div className="inline-flex flex-shrink-0 rounded-full border-2 border-indigo-500 p-1">
                          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-800 font-bold text-xl">ML</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-xl font-bold text-gray-900">Dr. Maria Lopez</h4>
                          <p className="text-indigo-600 font-medium">Associate Professor of Psychology</p>
                        </div>
                      </div>
                      <div className="mt-6">
                        <p className="text-lg text-gray-600 leading-relaxed">
                          "The personalization is what impressed me most. The AI adapts to my style and tone. My students can't tell the difference between my manually written comments and the AI-generated ones—they're that good."
                        </p>
                      </div>
                    </div>
                    <div className="px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600">
                      <div className="flex items-center justify-between">
                        <div className="flex text-white">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-1">
                              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/MoodleGraderBackground.png')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-black/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        </div>
        <div className="absolute bottom-0 inset-x-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto">
            <path fill="#ffffff" fillOpacity="0.05" d="M0,224L48,192C96,160,192,96,288,80C384,64,480,96,576,96C672,96,768,64,864,48C960,32,1056,32,1152,64C1248,96,1344,160,1392,192L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-8">
              Ready to Transform Your Grading Experience?
            </h2>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-12">
              Join thousands of educators using Moodle Grader to provide better feedback in less time. Experience the future of grading today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center sm:space-x-6 space-y-4 sm:space-y-0">
              <Link to="/app">
                <Button size="lg" className="px-8 py-4 text-lg font-medium bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg hover:shadow-xl transition-all duration-300">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg" className="px-8 py-4 text-lg font-medium border-2 border-white text-white hover:bg-white/10 shadow-lg hover:shadow-xl transition-all duration-300">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-5 lg:col-span-4">
              <div className="flex items-center">
                <img className="h-12 w-auto" src="/MoodleGraderLogo.png" alt="Moodle Grader" />
                <span className="ml-3 text-2xl font-bold">Moodle Grader</span>
              </div>
              <p className="mt-6 text-gray-300 text-base leading-relaxed">
                AI-powered grading that adapts to your style, saves you time, and provides your students with detailed, meaningful feedback.
              </p>
              <div className="mt-8 flex space-x-6">
                <Link to="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </Link>
                <Link to="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </Link>
                <Link to="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="md:col-span-7 lg:col-span-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-indigo-300">Product</h3>
                  <ul className="mt-5 space-y-4">
                    <li><Link to="/features" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Features</Link></li>
                    <li><Link to="/pricing" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Pricing</Link></li>
                    <li><Link to="/faq" className="text-base text-gray-300 hover:text-white transition-colors duration-300">FAQ</Link></li>
                    <li><Link to="/demo" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Demo</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-indigo-300">Company</h3>
                  <ul className="mt-5 space-y-4">
                    <li><Link to="/about" className="text-base text-gray-300 hover:text-white transition-colors duration-300">About Us</Link></li>
                    <li><Link to="/contact" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Contact</Link></li>
                    <li><Link to="/careers" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Careers</Link></li>
                    <li><Link to="/blog" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Blog</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-indigo-300">Legal</h3>
                  <ul className="mt-5 space-y-4">
                    <li><Link to="/privacy" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Privacy Policy</Link></li>
                    <li><Link to="/terms" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Terms of Service</Link></li>
                    <li><Link to="/accessibility" className="text-base text-gray-300 hover:text-white transition-colors duration-300">Accessibility</Link></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-base">
              &copy; {new Date().getFullYear()} Moodle Grader. All rights reserved.
            </p>
            <p className="mt-4 md:mt-0 text-gray-400 text-base">
              Designed with ❤️ for educators everywhere
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default LandingPage;