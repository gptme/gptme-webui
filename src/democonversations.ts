import type { Message } from "@/types/conversation";

export interface DemoConversation {
  name: string;
  lastUpdated: Date;
  messages: Message[];
}

const now = new Date();

// Demo conversations (read-only)
export const demoConversations: DemoConversation[] = [
  {
    name: "Project Setup",
    lastUpdated: now,
    messages: [
      {
        role: "assistant",
        content:
          "Hello! I'm gptme, your coding assistant. I can help you set up and manage your Python projects. What kind of project would you like to create?",
        timestamp: now.toISOString(),
      },
      {
        role: "user",
        content:
          "I want to create a new web scraping project with Python. Can you help me set it up?",
        timestamp: now.toISOString(),
      },
      {
        role: "assistant",
        content: `I'll help you set up a web scraping project. Here's a basic project structure:

\`\`\`
my_scraper/
├── requirements.txt
├── README.md
├── src/
│   ├── __init__.py
│   └── scraper.py
└── tests/
    ├── __init__.py
    └── test_scraper.py
\`\`\`

Let's start with the requirements.txt file:

\`\`\`txt
requests==2.31.0
beautifulsoup4==4.12.2
pytest==7.4.0
\`\`\`

Would you like me to help you implement the scraper.py file next?`,
        timestamp: now.toISOString(),
      },
      {
        role: "user",
        content:
          "Yes, please show me how to implement a basic scraper using BeautifulSoup.",
        timestamp: now.toISOString(),
      },
      {
        role: "assistant",
        content: `Here's a basic web scraper implementation:

\`\`\`python
# src/scraper.py
import requests
from bs4 import BeautifulSoup

class WebScraper:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()

    def fetch_page(self, url):
        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None

    def parse_html(self, html):
        if html is None:
            return None
        return BeautifulSoup(html, 'html.parser')

    def scrape_url(self, url):
        html = self.fetch_page(url)
        return self.parse_html(html)
\`\`\`

Would you like me to show you how to write tests for this scraper?`,
        timestamp: now.toISOString(),
      },
    ],
  },
  {
    name: "Debug Session",
    lastUpdated: now,
    messages: [
      {
        role: "assistant",
        content:
          "Welcome to the Debug Session! How can I help you debug your code today?",
        timestamp: now.toISOString(),
      },
    ],
  },
  {
    name: "File Operations",
    lastUpdated: now,
    messages: [
      {
        role: "assistant",
        content:
          "Let's work on file operations. What would you like to do with your files?",
        timestamp: now.toISOString(),
      },
    ],
  },
];
