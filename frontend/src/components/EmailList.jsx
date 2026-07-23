function EmailList({ title, emails = [] }) { return <div className="panel"><h3>{title} ({emails.length})</h3>{emails.length === 0 ? <p className="muted">No emails found.</p> : <ul className="email-list">{emails.map(email => <li key={email}>{email}</li>)}</ul>}</div>; }
export default EmailList;
