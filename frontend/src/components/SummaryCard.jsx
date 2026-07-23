function SummaryCard({ label, value, tone = 'default' }) { return <div className={`card ${tone}`}><div className="card-label">{label}</div><div className="card-value">{value}</div></div>; }
export default SummaryCard;
