I have updated the voting buttons in `VotingCard.tsx`.

**Changes made:**
- **For (Dafür):** Now uses a solid green background (`bg-success`) with high-contrast text when active.
- **Against (Dagegen):** Now uses a solid red background (`bg-destructive`) with high-contrast text when active.
- **Abstain (Enthaltung):** Now uses a solid neutral background (`bg-secondary`) with correct text color (`text-secondary-foreground`), ensuring it is clearly visible in both light and dark modes (fixing the "black on black" issue).

I verified the changes by compiling the frontend (`npm run build`), which passed successfully.