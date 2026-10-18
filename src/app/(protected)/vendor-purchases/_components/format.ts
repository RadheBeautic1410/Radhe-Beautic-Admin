const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

export const formatRupees = (n: number) => rupees.format(n)

/** Today's date in India as YYYY-MM-DD. */
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })

export const formatDateIST = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })
