(function () {
  "use strict";

  const sharedBio = (name) =>
    `${name} is part of the Genesis Educates team, helping students feel seen, supported and confident in the classroom. The focus is simple: clear concepts, consistent mentoring and the kind of personal attention that helps every learner move forward.`;

  window.GENESIS_TEAM = [
    {
      slug: "sahil-khanna",
      name: "Mr Sahil Khanna",
      role: "Founder",
      image: "assets/Sahil Khanna.jpeg",
      intro: "Building an institution where every child is visible.",
      bio: "Mr Sahil Khanna founded Genesis Educates in 2009 with a belief that excellent teaching begins with knowing every student. What started with three learners has grown into a close-knit academic community built on clarity, accountability and individual attention.",
      focus: "Vision, academic culture and student mentorship"
    },
    { slug: "anubhav", name: "Anubhav", role: "Genesis Team", image: "assets/Anubhav.jpeg", profileImage: "assets/anubhav_int.jpeg" },
    { slug: "bharti", name: "Bharti", role: "Genesis Team", image: "assets/Bharti.jpeg", profileImage: "assets/bharti_int.jpeg" },
    { slug: "himanshu", name: "Himanshu", role: "Genesis Team", image: "assets/Himanshu.jpeg", profileImage: "assets/himanshu_int.jpeg" },
    { slug: "inder", name: "Inder", role: "Genesis Team", image: "assets/Inder.jpeg", profileImage: "assets/inder_int.jpeg" },
    { slug: "parineeta", name: "Parineeta", role: "Genesis Team", image: "assets/Parineeta.jpeg", profileImage: "assets/parineeta_int.jpeg" },
    { slug: "pradeep", name: "Pradeep", role: "Genesis Team", image: "assets/Pradeep.jpeg", profileImage: "assets/pradeep_int.jpeg" },
    { slug: "puja", name: "Puja", role: "Genesis Team", image: "assets/Puja.jpeg", profileImage: "assets/puja_int.jpeg" },
    { slug: "ritika", name: "Ritika", role: "Genesis Team", image: "assets/Ritika.jpeg", profileImage: "assets/ritika_int.jpeg" },
    { slug: "sahil-paul", name: "Sahil Paul", role: "Genesis Team", image: "assets/Sahil Paul.jpeg", profileImage: "assets/sahilpaul_int.jpeg" },
    { slug: "samridh", name: "Samridh", role: "Genesis Team", image: "assets/Samridh.jpeg", profileImage: "assets/samridh_int.jpeg" },
    { slug: "shivani-rana", name: "Shivani Rana", role: "Genesis Team", image: "assets/Shivani Rana.jpeg", profileImage: "assets/shivani_int.jpeg" }
  ].map((member) => ({
    intro: "Helping students learn with clarity and confidence.",
    bio: sharedBio(member.name),
    focus: "Concept clarity, consistency and personal guidance",
    ...member
  }));
})();
