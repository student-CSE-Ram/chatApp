function assignAgent(agents) {
  return agents.find((a) => a.status === "free") || null;
}

function releaseAgent(agents, agentId) {
  const agent = agents.find((a) => a.socketId === agentId);
  if (agent) agent.status = "free";
}

module.exports = { assignAgent, releaseAgent };
