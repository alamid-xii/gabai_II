import { MapPin, Mail, Phone, Facebook, Twitter, Instagram } from "lucide-react";
import { Link } from "react-router";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#001840] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-[#F5C400] w-10 h-10 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-[#001840]" />
              </div>
              <div>
                <h3 className="font-bold text-xl">GabAI</h3>
                <p className="text-xs text-[#FFDC5F]">Eastern Mindoro College, Inc.</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              Your intelligent admission and campus navigation companion powered by Rag-Based Chatbot and 360° Virtual Tour technology.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-[#F5C400]">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link to="/enroll" className="text-[#FFFDF0] hover:text-[#FFDC5F] transition-colors duration-200">Admissions</Link></li>
              <li><Link to="/my-enrollments" className="text-[#FFFDF0] hover:text-[#FFDC5F] transition-colors duration-200">My Enrollments</Link></li>
              <li><Link to="/qa" className="text-[#FFFDF0] hover:text-[#FFDC5F] transition-colors duration-200">Help & Support</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-[#F5C400]">Resources</h4>
            <ul className="space-y-3">
              <li><Link to="/enrollment-guide" className="text-[#FFFDF0] hover:text-[#FFDC5F] transition-colors duration-200">Enrollment Guide</Link></li>
              <li><Link to="/enrollment-guide" className="text-[#FFFDF0] hover:text-[#FFDC5F] transition-colors duration-200">Requirements</Link></li>
              <li><Link to="/qa" className="text-[#FFFDF0] hover:text-[#FFDC5F] transition-colors duration-200">FAQs</Link></li>
              <li><Link to="/qa" className="text-[#FFFDF0] hover:text-[#FFDC5F] transition-colors duration-200">Contact Us</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-[#F5C400]">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-[#FFFDF0] text-sm">
                <MapPin className="w-4 h-4 mt-1 shrink-0 text-[#FFDC5F]" />
                <span>Vicente Ylagan St. Bagong Bayan II, Bongabong, Philippines, 5211</span>
              </li>
              <li className="flex items-center gap-2 text-[#FFFDF0] text-sm">
                <Mail className="w-4 h-4 shrink-0 text-[#FFDC5F]" />
                <a href="mailto:info@emc.edu.ph" className="hover:text-[#FFDC5F] transition-colors duration-200">
                  emc_1945@yahoo.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-[#FFFDF0] text-sm">
                <Phone className="w-4 h-4 shrink-0 text-[#FFDC5F]" />
                <span>(043) 123-4567</span>
              </li>
            </ul>
            <div className="flex gap-3 mt-6">
              <a href="https://www.facebook.com/share/1GyebKYixH/" target="_blank" rel="noopener noreferrer"
                className="bg-[#102A71] hover:bg-[#F5C400] w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 group">
                <Facebook className="w-4 h-4 text-[#FFFDF0] group-hover:text-[#001840]" />
              </a>
              
            </div>
          </div>
        </div>

        
        <div className="border-t border-[#102A71] pt-2">
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#FFFDF0]">
            <p>© {currentYear} Eastern Mindoro College. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="text-[#FFFDF0]/60">Privacy Policy</span>
              <span className="text-[#FFFDF0]/60">Terms of Service</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
