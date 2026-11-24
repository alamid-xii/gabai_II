import { useSchoolProfile } from "../hooks/useSchoolProfile";
import { MapPin, Mail, Phone, Facebook } from "lucide-react";
import { Link } from "react-router";

export function Footer() {
  const { profile, error } = useSchoolProfile();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#001840] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 mb-10">

          {/* Brand */}
          <div className="max-w-md">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/GabAi_Logo.png" alt="GabAI Logo" className="w-10 h-10 rounded-lg object-contain shadow shrink-0" />
              <div>
                <h3 className="font-bold text-xl">GabAI</h3>
                <p className="text-xs text-[#FFDC5F]">{profile?.schoolName || 'Eastern Mindoro College, Inc.'}</p>
              </div>
            </div>
            <p className="text-sm text-[#FFFDF0]/80 leading-relaxed">
              {profile?.tagline}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-base mb-4 text-[#F5C400]">Contact</h4>
            {error && <p className="text-xs text-[#FFDC5F] mb-2" role="status">{error}</p>}
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-[#FFFDF0] text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#FFDC5F]" />
                <span className="leading-snug">{profile?.address || 'Address to be announced'}</span>
              </li>
              <li className="flex items-start gap-2.5 text-[#FFFDF0] text-sm">
                <Mail className="w-4 h-4 mt-0.5 shrink-0 text-[#FFDC5F]" />
                <a
                  href={profile?.email ? `mailto:${profile.email}` : undefined}
                  className="hover:text-[#FFDC5F] transition-colors duration-200 leading-snug break-all min-h-0 min-w-0"
                >
                  {profile?.email || 'Email to be announced'}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-[#FFFDF0] text-sm">
                <Phone className="w-4 h-4 mt-0.5 shrink-0 text-[#FFDC5F]" />
                <span className="leading-snug">{profile?.phone || 'Phone to be announced'}</span>
              </li>
              {profile?.facebookUrl && (
                <li className="flex items-start gap-2.5 text-[#FFFDF0] text-sm">
                  <Facebook className="w-4 h-4 mt-0.5 shrink-0 text-[#FFDC5F]" />
                  <a
                    aria-label="School Facebook page"
                    href={profile.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#FFDC5F] transition-colors duration-200 leading-snug"
                  >
                    Eastern Mindoro College, Inc. - High School Department
                  </a>
                </li>
              )}
            </ul>
            {profile?.websiteUrl && (
              <div className="flex gap-3 mt-4">
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline hover:text-[#FFDC5F]">Official website</a>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#102A71] pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#FFFDF0]">
            <p>© {currentYear} {profile?.schoolName || 'Eastern Mindoro College, Inc.'}. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-[#FFFDF0]/80 hover:text-[#FFDC5F] transition-colors duration-200">Privacy Policy</Link>
              <Link to="/terms" className="text-[#FFFDF0]/80 hover:text-[#FFDC5F] transition-colors duration-200">Terms and Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
