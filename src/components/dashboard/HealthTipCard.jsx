const tips = [
  "💧 Drink at least 2 litres of water today.",
  "🚶 Walk for 30 minutes every day.",
  "🥗 Eat fresh fruits and vegetables.",
  "💊 Complete your prescribed medicines.",
];

export default function HealthTipCard() {

  const tip =
    tips[Math.floor(Math.random() * tips.length)];

  return (

    <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5">

      <h2 className="font-display text-xl text-primary">

        Daily Health Tip

      </h2>

      <p className="mt-3 leading-7 text-foreground">

        {tip}

      </p>

    </section>

  );
}