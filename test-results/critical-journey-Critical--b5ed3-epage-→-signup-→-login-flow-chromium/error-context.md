# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#root"
  - generic [ref=e3]:
    - region "Notifications (F8)":
      - list
    - region "Notifications alt+T"
    - generic [ref=e4]:
      - banner [ref=e5]:
        - generic [ref=e7]:
          - generic [ref=e8] [cursor=pointer]:
            - img "JEEnie" [ref=e9]
            - generic [ref=e10]: JEEnie
          - navigation [ref=e11]:
            - button "Home" [ref=e12] [cursor=pointer]
            - button "Why Us" [ref=e13] [cursor=pointer]
          - button "Sign In" [ref=e15] [cursor=pointer]
      - generic [ref=e17]:
        - generic [ref=e18]:
          - heading "Create Account" [level=3] [ref=e19]
          - paragraph [ref=e20]: Join thousands of students preparing for competitive exams
        - generic [ref=e21]:
          - button "Continue with Google" [ref=e22] [cursor=pointer]:
            - img
            - text: Continue with Google
          - paragraph [ref=e23]: Recommended — instant signup, no email verification needed
          - generic [ref=e28]: or
          - button "Sign up with email" [ref=e30] [cursor=pointer]:
            - img
            - text: Sign up with email
            - img
          - paragraph [ref=e32]:
            - text: Already have an account?
            - link "Sign In" [ref=e33] [cursor=pointer]:
              - /url: /login
```