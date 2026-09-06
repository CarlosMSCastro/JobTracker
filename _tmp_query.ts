async function main() {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
  const data = (await res.json()) as { data: { title: string; tags: string[]; job_types: string[]; company_name: string }[] };
  const job = data.data.find((j) => j.title.includes("YouTube Host"));
  console.log(JSON.stringify(job, null, 2));
}

main();
