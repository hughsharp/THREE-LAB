export const SPRITE_MAPPING = {
    // --- ROW 0: THE FOUNDATION ---
    "0_0": {
        icon: "Visual Studio Code",
        name: "Dev Ecosystem",
        description: "I am comfortable in VS Code. I can navigate the project structure and run the environment to check progress myself."
    },
    "0_1": {
        icon: "Curly braces",
        name: "Logic Integrity",
        description: "I check the logic. I review basic algorithms to ensure the business rules make sense before the team commits to code."
    },
    "0_2": {
        icon: "HTML tags",
        name: "Frontend Standards",
        description: "I know good structure. I check that the frontend follows basic semantic standards to ensure maintainability."
    },
    "0_3": {
        icon: "Figma",
        name: "UX Integrity",
        description: "I audit designs. I check Figma files to ensure the UI elements are consistent and technically feasible to build."
    },
    "0_4": {
        icon: "PowerPoint",
        name: "Strategic Vision",
        description: "I communicate clearly. I build effective presentations that translate technical progress into business updates for stakeholders."
    },
    "0_5": {
        icon: "Excel",
        name: "Data-Driven UX",
        description: "I verify with data. I use Excel to organize and analyze user metrics, helping the team focus on what matters."
    },
    "0_6": {
        icon: "Coffee cup",
        name: "Deep Focus",
        description: "I run on caffeine and code. It’s the fuel that helps me solve the impossible bugs that are blocking your roadmap."
    },
    "0_7": {
        icon: "Slack",
        name: "Cross-Func Bridge",
        description: "I connect the dots. I use Slack to facilitate clear communication between designers and developers, preventing misunderstandings."
    },

    // --- ROW 1: MANAGEMENT & STRATEGY ---
    "1_0": {
        icon: "Git branch",
        name: "Release Stability",
        description: "I understand the workflow. I follow the Git branching model to track which features are ready for the next release."
    },
    "1_1": {
        icon: "GitHub",
        name: "Code Governance",
        description: "I keep things organized. I check GitHub to ensure tasks are linked to PRs and documentation is being updated."
    },
    "1_2": {
        icon: "Jira",
        name: "Project Management",
        description: "I manage the flow. I use Jira and Confluence to keep tickets updated and remove blockers for the team."
    },
    "1_3": {
        icon: "Flowchart",
        name: "System Flow",
        description: "I visualize the path. I create flowcharts to clarify how data should move through the system, ensuring everyone aligns."
    },
    "1_4": {
        icon: "GitHub Copilot",
        name: "AI Efficiency",
        description: "I code smarter. I use GitHub Copilot to help me write boilerplate code and scripts faster, speeding up my own utility tasks."
    },
    "1_5": {
        icon: "Ethereum",
        name: "Web3 Integration",
        description: "I understand the basics. I know how wallets and transactions work, helping me define better onboarding flows for users."
    },
    "1_6": {
        icon: "Analytics graph",
        name: "Strategy & ROI",
        description: "I track the value. I monitor basic KPIs and ROI metrics to ensure our development efforts are actually paying off."
    },
    "1_7": {
        icon: "Bitcoin",
        name: "Blockchain",
        description: "I understand the concept. I know when to apply Blockchain for trust and security, and when a standard database is better."
    },

    // --- ROW 2: TECHNICAL ARCHITECTURE ---
    "2_0": {
        icon: "MySQL database",
        name: "Data Accuracy",
        description: "I can check the data. I run basic SQL queries to verify that the numbers on the dashboard match the database."
    },
    "2_1": {
        icon: "Notion",
        name: "Tech Specs",
        description: "I document requirements. I write clear specifications in Notion so developers know exactly what to build."
    },
    "2_2": {
        icon: "Tech stack",
        name: "Hybrid Capabilities",
        description: "I bridge the gap. My ability to code and design allows me to step in and help wherever the team has a bottleneck."
    },
    "2_3": {
        icon: "UiPath",
        name: "Design Ops Auto",
        description: "I reduce manual work. I set up basic automation flows to handle repetitive tasks, saving time for the team."
    },
    "2_4": {
        icon: "Agile loop",
        name: "Iterative Design",
        description: "I iterate quickly. I lead sprints where we test and refine UI concepts before committing to heavy development."
    },
    "2_5": {
        icon: "Python",
        name: "Data Scripting",
        description: "I am capable with Python. I write scripts to process data or generate mock content, unblocking designers early on."
    },
    "2_6": {
        icon: "API window",
        name: "API Contracts",
        description: "I understand APIs. I can read API documentation to ensure the frontend has the data fields it needs."
    },
    "2_7": {
        icon: "Google Antigravity",
        name: "AI-Enhanced Workflow",
        description: "I work faster with AI. I integrate LLM tools into my daily process to rapid-prototype ideas, generate content, and solve coding blockers instantly."
    },

    // --- ROW 3: INNOVATION & POLISH ---
    "3_0": {
        icon: "OpenAI",
        name: "AI-Enhanced UX",
        description: "I work faster with AI. I integrate LLM tools into my daily process to rapid-prototype ideas, generate content, and solve coding blockers instantly."
    },
    "3_1": {
        icon: "Dota 2",
        name: "Gamification",
        description: "I apply game logic. I use concepts from gaming to create more engaging and competitive user loops."
    },
    "3_2": {
        icon: "Google Gemini",
        name: "AI-Enhanced Workflow",
        description: "I work faster with AI. I integrate LLM tools into my daily process to rapid-prototype ideas, generate content, and solve coding blockers instantly."
    },
    "3_3": {
        icon: "Blender",
        name: "Asset Strategy",
        description: "I know 3D assets. I can open Blender to check model topology and export settings for better web performance."
    },
    "3_4": {
        icon: "Backend script",
        name: "Backend Logic",
        description: "I understand the backend. I know enough about server logic to discuss feasibility and constraints with engineers."
    },
    "3_5": {
        icon: "JavaScript",
        name: "JS Proficiency",
        description: "I write capable JavaScript. I can read the codebase and implement logic features without needing hand-holding."
    },
    "3_6": {
        icon: "WebGL",
        name: "Immersive Web",
        description: "I work with WebGL. I understand the 3D rendering pipeline well enough to guide the team on performance and visuals."
    },
    "3_7": {
        icon: "Translation",
        name: "Global Design",
        description: "I design for everyone. My multilingual background helps me spot translation and layout issues in the UI."
    }
};

export function getSpriteInfo(row, col) {
    const key = `${row}_${col}`;
    return SPRITE_MAPPING[key] || { name: `Unknown (${row},${col})`, description: "No description available" };
}
