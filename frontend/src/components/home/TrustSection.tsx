const items = [
    {
        title: "تنوع محصولات",
        description: "کاتالوگ متنوعی از تجهیزات کمپینگ، سفر و طبیعت‌گردی.",
    },
    {
        title: "کیفیت مطمئن",
        description: "انتخاب دقیق محصولات با تمرکز بر کیفیت و دوام.",
    },
    {
        title: "پشتیبانی مستقیم",
        description: "امکان تماس مستقیم از طریق تلفن و تلگرام برای راهنمایی خرید.",
    },
];

export function TrustSection() {
    return (
        <section className="border-t border-zinc-200 dark:border-zinc-800">
            <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
                <h2 className="mb-6 text-2xl font-bold">چرا از ما بخرید؟</h2>
                <ul className="grid list-none grid-cols-1 gap-6 sm:grid-cols-3">
                    {items.map((item) => (
                        <li key={item.title} className="flex flex-col gap-2 border-t-2 border-accent pt-4">
                            <h3 className="font-semibold">{item.title}</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.description}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
