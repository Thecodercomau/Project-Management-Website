async function main() {
  const login = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@projectflow.local', password: 'Admin123!' }),
  });
  const loginData = await login.json();
  if (!login.ok) throw new Error(loginData.error || 'Admin login failed');

  const summary = await fetch('http://localhost:5000/api/admin/summary', {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const summaryData = await summary.json();
  if (!summary.ok) throw new Error(summaryData.error || 'Admin summary failed');

  const usersCsv = await fetch(`http://localhost:5000/api/admin/export/users.csv?token=${encodeURIComponent(loginData.token)}`);
  const csvText = await usersCsv.text();
  if (!usersCsv.ok) throw new Error(csvText || 'Users CSV failed');

  console.log(JSON.stringify({
    adminLoginOk: login.ok,
    isAdmin: loginData.user.isAdmin,
    summary: summaryData,
    usersCsvOk: usersCsv.ok,
    usersCsvFirstLine: csvText.split(/\r?\n/)[0].replace(/^\uFEFF/, ''),
  }, null, 2));
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
