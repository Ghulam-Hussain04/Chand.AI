import Image from "next/image";
import { Github, Linkedin, Mail } from "lucide-react";

const developers = [
  {
    name: "Hamdan Vohra",
    role: "Lead Developer",
    image: "/hamdan_vohra.jpg",
    bio: "Specializing in AI and machine learning for lunar terrain analysis.",
    links: {
      github: "#",
      linkedin: "#",
      email: "#",
    },
  },
  {
    name: "Ghulam Hussain",
    role: "Vision Specialist",
    image: "/ghulam_hussain.jpg",
    bio: "Specializing in DL and Computer Vision for lunar terrain analysis.",
    links: {
      github: "#",
      linkedin: "#",
      email: "#",
    },
  },
  {
    name: "Hamza Hussain",
    role: "Backend Developer",
    image: "/hamza_hussain.jpg",
    bio: "Building robust APIs and data pipelines for lunar data processing.",
    links: {
      github: "#",
      linkedin: "#",
      email: "#",
    },
  },
];

export default function Developers() {
  return (
    <section id="team" className="py-24 px-6 bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-amber-400 text-sm font-semibold tracking-widest uppercase">
            Our Team
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            Meet the <span className="text-amber-400">Developers</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            The passionate minds behind LunarVision, dedicated to advancing
            lunar exploration through innovative technology.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {developers.map((dev, index) => (
            <div
              key={index}
              className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6 text-center hover:border-amber-400/50 transition-all duration-300 hover:-translate-y-2 group"
            >
              {/* Profile Image */}
              <div className="relative w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-amber-400/30 group-hover:border-amber-400 transition-colors">
                <Image
                  src={dev.image || "/fallback_profile.png"}
                  alt={dev.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Name & Role */}
              <h3 className="text-xl font-bold text-white mb-1">{dev.name}</h3>
              <p className="text-amber-400 font-medium mb-3">{dev.role}</p>
              <p className="text-gray-400 text-sm mb-6">{dev.bio}</p>

              {/* Social Links */}
              <div className="flex justify-center gap-4">
                <a
                  href={dev.links.github}
                  className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-gray-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
                  aria-label={`${dev.name} GitHub`}
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href={dev.links.linkedin}
                  className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-gray-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
                  aria-label={`${dev.name} LinkedIn`}
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href={dev.links.email}
                  className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-gray-400 hover:bg-amber-500 hover:text-slate-900 transition-colors"
                  aria-label={`${dev.name} Email`}
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
