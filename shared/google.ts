const H = /^https:\/\/((www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\/(maps|search)|maps\.google\.[a-z]{2,3}(\.[a-z]{2})?|maps\.app\.goo\.gl|goo\.gl\/maps|g\.page|g\.co\/kgs|search\.google\.com\/local)(\/|\?|$)/i
export const isGoogleUrl = (u: string) => H.test(u) && !/\s/.test(u)
