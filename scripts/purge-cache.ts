const main = async () => {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;

  await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      purge_everything: true,
    }),
  })
    .then(() => console.log("Purged cache"))
    .catch(() => console.error("Failed to purge cache"));
};

main();
