# Deal Selection Framework

**Purpose**: Systematic criteria for accepting or declining roles, clients, and projects.  
**Last Updated**: January 15, 2026  
**Audience**: Self (decision-making framework), engineers evaluating opportunities

---

## Core Principle: Every Yes Is a No to Something Else

**The Problem**: Engineers accept work based on immediate need (money, resume gap, fear of saying no).

**The Cost**: Time spent on wrong projects compounds negatively. You build the wrong skills, work with the wrong people, and damage your positioning.

**The Goal**: Accept only work that compounds positively—builds your moat, reinforces your positioning, or pays extremely well.

---

## The Decision Matrix

### Accept Immediately (Green Zone)

**Criteria** (All must be true):

1. High-stakes domain (financial, health, regulated, or high-scale)
2. You own technical decisions (not just executing specs)
3. Client/employer understands quality requires time
4. Compensation matches or exceeds market rate for your positioning
5. Work builds your moat (chaos testing, invariants, documented decisions)

**Example**: Fintech startup needs payment infrastructure. You design architecture, own testing strategy, document trade-offs. $120/hour or $150K+ salary.

**Why Accept**: Compounds your moat. Adds strong portfolio piece. Pays well.

---

### Consider Carefully (Yellow Zone)

**Criteria** (2-3 of these are true):

1. Work is adjacent to your moat (not core, but related)
2. Compensation is above average but not premium
3. Some autonomy, but within constraints
4. Learning opportunity exists but isn't guaranteed

**Example**: E-commerce platform needs backend API work. Not financial systems, but correctness matters. $80/hour. Some architectural input, but framework is chosen.

**Decision Framework**:

- If you need income: Accept, but plan exit strategy
- If you have options: Negotiate for more autonomy or higher rate
- If you're selective: Decline unless other factors tip scale

**Key Question**: "Will this work make future opportunities easier or harder?"

---

### Decline (Red Zone)

**Criteria** (Any one is true):

1. Client/employer expects premium work at budget rates
2. No technical decision authority (pure execution role)
3. Unrealistic timeline or scope (setup for failure)
4. Low-stakes domain that won't build portfolio (marketing site, CRUD app)
5. Red flags in engagement (previous developer left, vague scope, chaos in organization)

**Example**: Startup wants "Facebook clone" for $5K, 2-week timeline. Or: agency wants backend developer at $40/hour to execute client specs with no input.

**Why Decline**: Damages positioning. Wastes time. Doesn't compound. Often leads to conflict.

**How to Decline**: "This doesn't align with my focus right now, but I appreciate you thinking of me. Best of luck finding the right fit."

---

## Signals of Healthy Engagements

### Pre-Engagement Signals (During Interview/Proposal)

**Green Flag #1**: They ask about your process.

**What They Say**: "How do you approach testing?" or "How do you handle changing requirements?"

**What It Means**: They care about quality, not just delivery. They've been burned before. They understand process matters.

---

**Green Flag #2**: They acknowledge trade-offs.

**What They Say**: "We need this fast, so we're okay with deferring X feature."

**What It Means**: They understand constraints. They can prioritize. Less likely to have scope creep.

---

**Green Flag #3**: Budget matches complexity.

**What They Say**: "We've budgeted $50K for this payment infrastructure project."

**What It Means**: They understand value. They're not trying to exploit cheap labor. Financial stability likely.

---

**Green Flag #4**: Technical leadership exists.

**What You See**: CTO or senior engineer interviews you. They ask intelligent questions.

**What It Means**: Someone understands technical quality. You won't be explaining basics. Less risk of undervaluation.

---

**Green Flag #5**: Clear success criteria.

**What They Say**: "Success is wallet operations with zero discrepancies and payment processing under 2-second latency."

**What It Means**: They know what they need. Measurable outcomes. Less risk of "I'll know it when I see it."

---

### During Engagement Signals

**Green Flag #1**: They trust your recommendations.

**What Happens**: You suggest adding chaos tests. They approve without resistance.

**What It Means**: They hired you for judgment, not just execution. Healthy dynamic.

---

**Green Flag #2**: They communicate proactively.

**What Happens**: They warn you about upcoming deadline shifts or priority changes early.

**What It Means**: Respectful. Organized. Less likely to create fire drills.

---

**Green Flag #3**: They protect your time.

**What Happens**: They batch questions, schedule meetings efficiently, don't interrupt flow.

**What It Means**: They understand maker's schedule. Respectful of focus time.

---

**Green Flag #4**: They value documentation.

**What Happens**: You write ARCHITECTURE_DECISIONS.md. They read it and ask thoughtful questions.

**What It Means**: Long-term thinking. They care about maintenance, not just launch.

---

**Green Flag #5**: They pay on time, every time.

**What Happens**: Invoice submitted Friday. Payment arrives within 5 days.

**What It Means**: Financial stability. Professionalism. No payment chasing.

---

## Signals of Dangerous Engagements

### Pre-Engagement Red Flags

**Red Flag #1**: Vague scope with pressure to commit.

**What They Say**: "We'll figure out details as we go. Can you start Monday?"

**What It Means**: Chaos. No planning. High risk of scope creep and conflict.

**Your Response**: "I need clear scope before committing. Let's define deliverables first."

---

**Red Flag #2**: Budget doesn't match scope.

**What They Say**: "We need full payment infrastructure with wallet, subscriptions, refunds. Budget: $3K."

**What It Means**: Unrealistic expectations. Doesn't understand value. Will be unhappy with any outcome.

**Your Response**: "That scope typically runs $20K-30K. If budget is fixed at $3K, I'm not the right fit."

---

**Red Flag #3**: "Previous developer didn't finish."

**What They Say**: "Last developer left mid-project. Need someone to take over ASAP."

**What It Means**: Either previous developer was unprofessional, or client is difficult. Unknown risk.

**Your Response**: "Can you share what happened with previous engagement? What would you do differently?"

**Listen For**: If they blame 100% on developer → client is problem. If they acknowledge issues → might be salvageable.

---

**Red Flag #4**: "We're lean/scrappy/hustling."

**What They Say**: "We're a startup, everyone wears many hats. Looking for someone passionate who hustles."

**What It Means**: Unlimited scope creep. Expect unpaid overtime. No boundaries.

**Your Response**: "I work well in dynamic environments. Let's define core deliverables I'm accountable for first."

---

**Red Flag #5**: "Can you do this cheaper?"

**What They Say**: "Your rate is high. Can you go lower? We'll have lots of future work."

**What It Means**: Price-sensitive. Doesn't value expertise. "Future work" rarely materializes.

**Your Response**: "My rate reflects the quality and accountability I provide. If budget is the primary constraint, I'm not the right fit."

---

### During Engagement Red Flags

**Red Flag #1**: Scope creep without compensation adjustment.

**What Happens**: "Can you also add real-time notifications? Should be quick."

**What It Means**: Boundary testing. Will escalate if you don't push back.

**Your Response**: "That's outside original scope. Happy to add it as additional phase. Would add [X hours/$Y]."

---

**Red Flag #2**: Deadline pressure without priority clarity.

**What Happens**: "Everything is urgent. Need it all by Friday."

**What It Means**: Poor planning. No prioritization ability. Chaos will continue.

**Your Response**: "I can deliver X by Friday if we defer Y and Z. Which is most critical?"

---

**Red Flag #3**: Micromanagement.

**What Happens**: Daily standups to report progress. Constant interruptions. Questioning every technical choice.

**What It Means**: Lack of trust. You're being treated as junior, not expert.

**Your Response**: "I work best with clear deliverables and autonomy on execution. Can we shift to weekly check-ins?"

**If No**: Consider exiting. Micromanagement is unsustainable.

---

**Red Flag #4**: Payment delays.

**What Happens**: Invoice due date passes. Excuses emerge. Payment takes weeks.

**What It Means**: Financial instability or disrespect. Will get worse.

**Your Response**: "I need payment within agreed terms. Going forward, I'll pause work if payment is late."

**If Continues**: Exit immediately. Don't do unpaid work.

---

**Red Flag #5**: Blame culture.

**What Happens**: When issues arise, they immediately look for who to blame rather than how to fix.

**What It Means**: Toxic culture. You'll be blamed for systemic issues.

**Your Response**: Minimize involvement. Document everything. Prepare exit strategy.

---

## Authority vs Responsibility Matrix

### The Problem

**Authority**: What you can decide  
**Responsibility**: What you're accountable for

**Healthy**: Authority matches responsibility. You decide, you own outcomes.

**Unhealthy**: Responsibility without authority. You're accountable for outcomes but can't make decisions.

---

### The Matrix

| Scenario         | Authority | Responsibility | Health      | Action                                                |
| ---------------- | --------- | -------------- | ----------- | ----------------------------------------------------- |
| **Ideal**        | High      | High           | ✅ Healthy  | Accept. You design solution, own outcomes.            |
| **Learning**     | Low       | Low            | ✅ Healthy  | Accept if learning. Junior role, clear expectations.  |
| **Exploitative** | Low       | High           | ❌ Toxic    | Decline or negotiate. You're blamed but can't decide. |
| **Privileged**   | High      | Low            | ⚠️ Unstable | Rare. Enjoy while it lasts but expect shift.          |

---

### Examples

**Healthy: High Authority, High Responsibility**

**Scenario**: Fintech startup hires you to design payment infrastructure. You choose tech stack, define architecture, write tests, document decisions. You're accountable for correctness and performance.

**Why Healthy**: You have control over outcomes you're responsible for.

**Accept**: Yes. This is ideal positioning.

---

**Healthy: Low Authority, Low Responsibility**

**Scenario**: Large company hires you as mid-level engineer. Senior architect designs system. You implement module within constraints. You're accountable for your module, not entire system.

**Why Healthy**: Responsibility matches authority. Clear expectations.

**Accept**: Yes, if you want stable income and mentorship. No, if you want ownership and autonomy.

---

**Toxic: Low Authority, High Responsibility**

**Scenario**: Startup hires you as "Senior Engineer." Founder makes all technical decisions (tech stack, architecture, priorities). But when system has issues, you're blamed.

**Why Toxic**: You're responsible for outcomes you can't control.

**Example Dialogue**:

- Founder: "Use MongoDB for everything."
- You: "Financial data needs ACID transactions. PostgreSQL is better fit."
- Founder: "MongoDB is what I know. Use it."
- [Later, when financial discrepancies occur]
- Founder: "Why didn't you prevent this? You're the senior engineer."

**Accept**: No. Decline or renegotiate for authority.

**Red Flag**: If they resist giving authority but demand accountability, walk away.

---

**Unstable: High Authority, Low Responsibility**

**Scenario**: Company gives you technical freedom but doesn't hold you accountable for outcomes.

**Why Unstable**: Rare. Usually means company is disorganized or doesn't understand engineering. Authority without accountability often shifts when problems emerge.

**Accept**: Cautiously. Enjoy autonomy but expect things to change when stakes increase.

---

### How to Negotiate Authority-Responsibility Alignment

**During Interview/Proposal**:

**You Ask**: "Can you walk me through decision-making for technical choices? Who decides architecture, tech stack, testing strategy?"

**Healthy Answer**: "You'd own those decisions. We'll provide business context and constraints, but technical execution is yours."

**Unhealthy Answer**: "We have strong opinions about tech. You'd implement within our framework."

**Your Response to Unhealthy**: "I work best when I have architectural autonomy. If technical decisions are predetermined, I'm not the right fit unless accountability is also reduced."

---

**During Engagement** (If Misalignment Emerges):

**Script**: "I'm noticing a mismatch. I'm accountable for [outcome], but I don't have authority over [decision]. Can we align these? Either I need decision authority, or we need to clarify that [outcome] isn't my responsibility."

**Healthy Response**: "You're right. Let's clarify. You own [decision] and [outcome]."

**Unhealthy Response**: "You need to figure it out. That's what we hired you for."

**Your Action**: Document the conversation. If misalignment continues, prepare to exit.

---

## When to Walk Away

### Early Exit (During Interview/Proposal Stage)

**Trigger #1**: Red flags in job description or initial conversation.

**Examples**:

- Vague scope with pressure to commit
- Budget doesn't match complexity
- "Looking for passionate hustlers" language
- Founder makes all technical decisions but wants senior engineer accountability

**Action**: Polite decline. "This doesn't align with my focus right now. Best of luck finding the right fit."

**Why Walk Early**: Saves everyone's time. You preserve reputation (professional decline beats messy exit).

---

**Trigger #2**: Gut feeling during interview.

**Examples**:

- Interviewer is dismissive or arrogant
- Technical questions are superficial or don't respect your depth
- Company culture feels chaotic or blame-focused

**Action**: Trust your gut. "I don't think this is the right fit. I appreciate your time."

**Why**: Gut feelings are pattern recognition from past experience. Don't ignore them.

---

### Mid-Project Exit (After Starting Work)

**Trigger #1**: Scope creep without compensation adjustment.

**Timeline**:

- Week 1: Minor scope addition. You flag it. Client acknowledges.
- Week 2: Another scope addition. You flag it. Client says "just this once."
- Week 3: Pattern is clear. Boundaries aren't respected.

**Action**: "We've added [X, Y, Z] outside original scope. I need to either adjust timeline or compensation. If neither is possible, I'll complete original scope only."

**If They Resist**: "I need to wrap up at end of [current milestone]. I'll provide documentation for next engineer."

**Why Walk**: Scope creep never stops on its own. You're teaching them it's okay.

---

**Trigger #2**: Payment delays.

**Timeline**:

- Invoice #1: Due Friday. Paid following Wednesday. (Acceptable)
- Invoice #2: Due Friday. Paid 2 weeks later with excuses. (Warning)
- Invoice #3: Due Friday. No payment, vague promises. (Danger)

**Action**: "I haven't received payment for invoice #3, now [X days] overdue. I'm pausing work until payment is received."

**If They Resist or Delay Further**: "I'm ending engagement. Final invoice covers work through [date]. Payment due within 7 days."

**Why Walk**: Payment delays indicate financial instability or disrespect. Will only get worse.

---

**Trigger #3**: Authority-responsibility mismatch becomes clear.

**Example**:

- You're blamed for system issues you warned about but weren't allowed to fix.
- Client overrides your technical decisions, then blames you when outcomes are poor.

**Action**: "I'm noticing I'm accountable for outcomes I don't have authority to control. I need either decision authority or reduced accountability. If neither is possible, I'll complete [current milestone] and transition out."

**Why Walk**: You can't succeed in this environment. Staying damages reputation.

---

**Trigger #4**: Toxic work environment.

**Examples**:

- Constant blame, no psychological safety
- Micromanagement, no trust
- Unreasonable demands (work weekends, constant interruptions)

**Action**: "This engagement isn't working for me. I'll complete [current milestone] and provide transition documentation."

**If They Ask Why**: "The working style doesn't match my process. I think a different engineer would be a better fit."

**Why Walk**: Your mental health matters. No amount of money is worth sustained toxicity.

---

### Late Exit (Near Project Completion)

**Trigger #1**: Payment withheld over subjective disputes.

**Example**:

- Project is complete per original spec.
- Client says "This isn't what I wanted" (without pointing to spec violation).
- Client refuses final payment.

**Action**:

1. Document what was delivered against original spec
2. Send formal notice: "Deliverables met original spec. Final payment due within [X days]."
3. If no resolution: Small claims court or collections (if amount justifies it)

**Prevention**: Clear acceptance criteria upfront. Document everything.

---

**Trigger #2**: Scope expansion after "final" milestone.

**Example**:

- Project reaches 95% completion.
- Client adds "just one more feature" before final payment.
- Pattern repeats.

**Action**: "Original scope is complete. Additional features are new project. I can provide proposal for phase 2, or we can close this engagement."

**If They Resist**: "I'm closing this phase. Here's final documentation. If you'd like phase 2, I'm happy to discuss separately."

**Why**: "Final milestone" goal post will keep moving. Close the loop.

---

## Exit Scripts (Professional Decline Templates)

### Script #1: Early Decline (Job Description Red Flags)

**Scenario**: Job post has red flags. You're declining before applying.

**Message**: "I appreciate the opportunity, but this role doesn't align with my current focus. Best of luck finding the right candidate."

**Why Short**: No need to explain. Keep it professional and brief.

---

### Script #2: Post-Interview Decline

**Scenario**: Interview revealed misalignment. They might make offer.

**Message**: "Thank you for the opportunity to interview. After our conversations, I don't think this role is the right fit for my background and what you need. I appreciate your time and wish you success in the search."

**Why**: Acknowledges interview time. Frames as mutual mismatch, not criticism.

---

### Script #3: Declining After Offer (Low Compensation)

**Scenario**: Offer is below your rate. You're declining.

**Message**: "Thank you for the offer. I've reviewed it carefully, and the compensation is below my current rate. I need to decline, but I appreciate you considering me."

**If They Ask Your Rate**: "I typically work at $[X]/hour or $[Y]K salary for this type of role."

**If They Can't Meet It**: "I understand. I'm not the right fit at this budget. Best of luck."

---

### Script #4: Mid-Project Exit (Scope Creep)

**Scenario**: Scope creep is unsustainable. You're exiting after current milestone.

**Message**: "I've noticed scope has expanded significantly beyond our original agreement. I'll complete [current milestone] by [date], but I won't be able to continue beyond that. I'll provide documentation to support the transition."

**If They Push Back**: "I understand this is disappointing. I'm committed to delivering [milestone] well, but continuing isn't sustainable for me."

**Why**: Clear boundary. Acknowledges impact. Commits to clean handoff.

---

### Script #5: Mid-Project Exit (Payment Issues)

**Scenario**: Payment is consistently late. You're exiting.

**Message**: "I haven't received payment for invoices #[X] and #[Y], totaling $[amount], now [X days] overdue. I'm pausing work immediately. Once payment is received, I'll provide transition documentation, but I won't be continuing the engagement."

**If They Make Excuses**: "I understand things happen, but I need payment within agreed terms. I'm unable to continue without resolution."

**Why**: Firm boundary. No negotiation on payment terms.

---

### Script #6: Exit Due to Toxic Environment

**Scenario**: Work environment is toxic. You're exiting for your well-being.

**Message**: "I've decided this engagement isn't a good fit for me. I'll complete work through [date] and provide transition documentation. I appreciate the opportunity."

**If They Ask Why**: "The working style doesn't match my process. I think you'll have better results with a different engineer."

**Why**: Doesn't burn bridges. Doesn't provide ammunition for argument. Short and professional.

---

## Decision-Making Process

### Step 1: Initial Evaluation (Before Applying/Proposing)

**Questions to Answer**:

1. Does this work build my moat? (High-stakes domain, ownership, learning)
2. Does compensation match my positioning? ($80-120/hour or $120K-180K salary for senior backend)
3. Are there obvious red flags? (Vague scope, unrealistic budget, "passionate hustlers")

**Decision**:

- All yes → Apply/propose
- Mixed → Research more (ask questions during interview)
- Any no on red flags → Decline

---

### Step 2: Interview/Proposal Stage

**Questions to Ask**:

1. "Can you walk me through decision-making for technical choices?"
2. "What does success look like in 3 months? 6 months?"
3. "How do you handle changing requirements or scope adjustments?"
4. "What happened with the previous engineer?" (if applicable)

**Listen For**:

- Green flags: Clear answers, acknowledges trade-offs, trusts your judgment
- Red flags: Vague answers, unrealistic expectations, micromanagement signals

**Decision**:

- Mostly green flags → Accept (or negotiate details)
- Mixed → Negotiate (clarify authority, adjust compensation, define scope)
- Mostly red flags → Decline professionally

---

### Step 3: During Engagement

**Monitor**:

- Payment: On time every time?
- Scope: Staying within agreed boundaries?
- Communication: Respectful and organized?
- Authority: Do you have decision-making power matching responsibility?

**Action**:

- All healthy → Continue
- Minor issues → Address immediately (don't let slide)
- Major issues or patterns → Prepare exit strategy

---

### Step 4: Post-Engagement Reflection

**Questions to Answer**:

1. Did this work build my moat?
2. Would I work with this client/company again?
3. What would I do differently next time?

**Use This**: Refine decision criteria for next opportunity.

---

## Final Principle: Every Yes Shapes Future Options

**Accept Low-Quality Work** → More low-quality opportunities  
**Accept High-Quality Work** → More high-quality opportunities

**Work Compounds**: Each project positions you for the next one.

**Your Goal**: Accept work that makes future decisions easier, not harder.

**Rachel Foods as Example**: High-quality portfolio piece. Opens doors to high-stakes backend roles. Filters out low-quality clients who don't value rigor.

---

**Document Version**: 1.0  
**Phase**: 15 - Deal Selection, Career Moats & Compounding Advantage  
**Purpose**: Systematic framework for evaluating opportunities and knowing when to decline
