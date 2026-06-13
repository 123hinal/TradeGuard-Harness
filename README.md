HARNESS.md
Financial Trade Approval Harness
Overview
The Financial Trade Approval Harness is a governance framework that surrounds an AI-powered trade recommendation agent.
The agent’s responsibility is to analyze market and portfolio information and recommend trades. The harness is responsible for enforcing business constraints, validating outputs, managing risk controls, handling material flow, generating alarms, and providing observability.
The design follows the principle:
Agents focus on tasks. Harnesses focus on constraints.
The agent can recommend a trade, but the harness determines whether the trade is approved, rejected, escalated, or modified.
________________________________________
Problem Statement
Financial systems require strict controls around trade execution.
AI agents may generate useful recommendations, but they should not be allowed to execute trades without:
•	Risk controls
•	Compliance validation
•	Portfolio checks
•	Auditability
•	Human approval paths
•	Operational observability
The Financial Trade Approval Harness provides these capabilities as reusable infrastructure independent of the underlying AI model.
________________________________________
Architecture
User Request
      │
      ▼
Material Handler
      │
      ▼
Guardrails
      │
      ▼
Trade Agent
      │
      ▼
Tools
      │
      ▼
Checkpoints
      │
      ▼
Alarm Engine
      │
      ▼
Decision Engine
      │
      ▼
Trade Approval Result
The harness owns every stage except the worker agent.
________________________________________
Design Principles
Separation of Concerns
The worker agent focuses exclusively on trade analysis.
The harness owns:
•	Input validation
•	Tool orchestration
•	Risk evaluation
•	Compliance enforcement
•	Escalation
•	Monitoring
•	Audit logging
Agent Portability
Agents implement a common interface.
interface TradeAgent {
    analyzeTrade(
        request: TradeRequest
    ): Promise<TradeRecommendation>;
}
The harness can swap agents without modification.
Supported examples:
•	OpenAITradeAgent
•	ClaudeTradeAgent
________________________________________
Pillar 1: Guardrails
Guardrails prevent unsafe actions before or during agent execution.
Guardrail Types
Maximum Trade Size
{
  "name": "MAX_TRADE_SIZE",
  "limit": 50000
}
Purpose:
Prevent oversized transactions.
Approved Securities
{
  "name": "APPROVED_SECURITIES"
}
Purpose:
Allow trading only within approved instruments.
Retirement Account Restrictions
{
  "name": "RETIREMENT_ACCOUNT_RULES"
}
Purpose:
Block leverage, options, and margin positions.
Human Approval Threshold
{
  "name": "MANUAL_APPROVAL",
  "threshold": 25000
}
Purpose:
Require approval for large trades.
________________________________________
Pillar 2: Checkpoints
Checkpoints evaluate the output produced by the agent.
Each checkpoint has explicit pass/fail criteria.
Concentration Risk Checkpoint
Pass Criteria:
Single Position < 20%
Risk Score Checkpoint
Pass Criteria:
Risk Score < 80
Confidence Checkpoint
Pass Criteria:
Confidence > 70%
Liquidity Checkpoint
Pass Criteria:
Average Daily Volume Above Threshold
Checkpoint results are persisted and replayable.
Example:
{
  "checkpoint": "RISK_SCORE",
  "passed": false,
  "value": 92,
  "timestamp": "2026-06-12T10:00:00Z"
}
________________________________________
Pillar 3: Material Handling
Material Handling standardizes all inputs and outputs.
Input Normalization
Raw Input
{
  "request": "Buy 40k NVDA"
}
Normalized Input
{
  "action": "BUY",
  "ticker": "NVDA",
  "amount": 40000
}
Output Standardization
All stages emit structured events.
{
  "runId": "123",
  "stage": "CHECKPOINT",
  "status": "PASSED",
  "timestamp": "..."
}
Benefits:
•	Replayability
•	Auditability
•	Consistent interfaces
•	Easier debugging
________________________________________
Pillar 4: Alarms
Alarms notify operators when risk conditions occur.
Every alarm contains:
{
  "type": "",
  "severity": "",
  "context": {},
  "recommended_action": ""
}
Alarm Types
POSITION_CONCENTRATION
{
  "type": "POSITION_CONCENTRATION",
  "severity": "HIGH",
  "recommended_action": "Reduce trade size"
}
RISK_SCORE_EXCEEDED
{
  "type": "RISK_SCORE_EXCEEDED",
  "severity": "CRITICAL",
  "recommended_action": "Reject trade"
}
LOW_CONFIDENCE
{
  "type": "LOW_CONFIDENCE",
  "severity": "MEDIUM",
  "recommended_action": "Escalate to human"
}
LOOP_LIMIT_EXCEEDED
{
  "type": "LOOP_LIMIT_EXCEEDED",
  "severity": "HIGH",
  "recommended_action": "Terminate run"
}
________________________________________
Agent Runtime Loop
The harness controls the execution loop.
while (!complete) {
    analyze();
    chooseTool();
    executeTool();
    evaluate();
}
Runtime Limits
Maximum Iterations = 5
Maximum Runtime = 20 seconds
Maximum Cost = $0.25
These limits prevent runaway execution.
________________________________________
Tool Framework
Tools provide capabilities to the agent.
Portfolio Analyzer
Returns:
•	Holdings
•	Allocation percentages
•	Portfolio concentration
Risk Calculator
Returns:
•	Risk score
•	Volatility metrics
Market Data Tool
Returns:
•	Market prices
•	Liquidity metrics
•	Trading volume
All tools expose:
interface Tool {
    name: string;
    schema: JSONSchema;
    execute(input): Result;
}
________________________________________
Human-In-The-Loop Escalation
The harness knows when to stop and ask.
Escalation occurs when:
•	Trade size exceeds threshold
•	Risk score exceeds limit
•	Confidence falls below threshold
•	Compliance violations are detected
Example:
{
  "decision": "ESCALATED",
  "reason": "Trade exceeds approval threshold"
}
________________________________________
Observability
The harness is fully instrumented using OpenTelemetry.
Every stage generates spans.
Trade Run
 ├── Material Handler
 ├── Guardrails
 ├── Agent
 ├── Tool Calls
 ├── Checkpoints
 ├── Alarm Engine
 └── Final Decision
Metrics
Operational
•	p50 latency
•	p95 latency
•	error rate
•	tool success rate
AI
•	token usage
•	model cost
•	retries
•	iterations
Business
•	approval rate
•	rejection rate
•	alarm frequency
•	checkpoint failures
________________________________________
Demo Scenario
Input:
{
  "request": "Buy $40,000 NVDA"
}
Agent Recommendation:
{
  "action": "BUY",
  "ticker": "NVDA",
  "amount": 40000
}
Checkpoint Result:
{
  "checkpoint": "CONCENTRATION",
  "passed": false
}
Alarm:
{
  "type": "POSITION_CONCENTRATION",
  "severity": "HIGH"
}
Decision:
{
  "status": "REJECTED"
}
The harness changes the outcome based on checkpoint and guardrail feedback, demonstrating governance over the agent.
________________________________________
Future Enhancements
•	Multi-agent portfolio review
•	Regulatory compliance engine
•	Portfolio optimization tools
•	Historical trade replay
•	Real-time market feeds
•	Multi-model evaluation framework
________________________________________
Conclusion
The Financial Trade Approval Harness demonstrates a production-style governance layer around AI agents.
The worker agent remains focused on generating trade recommendations, while the harness provides:
•	Guardrails
•	Checkpoints
•	Material Handling
•	Alarms
•	Human Approval
•	Observability
•	Auditability
This separation ensures that risk management and operational controls remain independent of the underlying AI model.
