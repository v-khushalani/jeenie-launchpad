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
          - button [ref=e11] [cursor=pointer]:
            - img [ref=e12]
      - generic [ref=e14]:
        - generic [ref=e15]:
          - heading "Create Account" [level=3] [ref=e16]
          - paragraph [ref=e17]: Join thousands of students preparing for competitive exams
        - generic [ref=e18]:
          - button "Continue with Google" [ref=e19] [cursor=pointer]:
            - img
            - text: Continue with Google
          - paragraph [ref=e20]: Recommended — instant signup, no email verification needed
          - generic [ref=e25]: or
          - button "Sign up with email" [ref=e27] [cursor=pointer]:
            - img
            - text: Sign up with email
            - img
          - paragraph [ref=e29]:
            - text: Already have an account?
            - link "Sign In" [ref=e30] [cursor=pointer]:
              - /url: /login
```