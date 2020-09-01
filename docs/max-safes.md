Max safe parameters
===================

Conviction and threshold calculations could overflow if some parameters are too big. In this document we are analizing which are the max safe parameters for those two solidity functions.

Conviction function
-------------------

The conviction formula is `a^t * y(0) + x * (1 - a^t) / (1 - a)`, and in order to implement it in solidity we do:

```
(2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
```

The conviction could overflow on the numerator because many potencial big numbers are being multiplied, such as `y0` and `x`. Considering the scaling factor `D = 10^7`, and `a^t` having a range between 0 and 1, we analyse the behaviour of the formula:

* `a^t = 0` implies that the numerator is `x * D * 2^128` which should be lesser than `2^256` to avoid an overflow. So we must assure `x < 2^128 / D` in order to be safe.
* `a^t = 1` implies that the numerator is `2^128 * y0` which also should be lesser than `2^256`. Matematically, the max value for `y0` is `x/(1-a)` which is also equal to `x * D`, so we end up with the same inequality of the previous case: `x < 2^128 / D`.
* For any case in the middle of `0 < a^t < 1` we obtain the same result.

Threshold function
------------------

The threshold formula is `ρ * totalStaked / (1 - a) / (β - requestedAmount / total)**2` and we calculate it in two steps:

```
weight = ρ * D
maxRatio = β * D
denom = maxRatio * 2 ** 64 / D  - requestedAmount * 2 ** 64 / funds
threshold = (weight * 2 ** 128 / D) / (denom ** 2 / 2 ** 64) * totalStaked * D / 2 ** 128
```

The max values for `maxRatio` and `weight` are `D`, and they are very soon divided by D, so they can't overflow.

If `requestedAmount = 0`, we could have a denominator of `2^64`, that later is squared, potentially reaching `2^128`, which is a safe number.

If we have a denominator very close to 0 (which means that the `requestedAmount/funds` ratio is close to `β`), we will incur in a division by 0 when doing `denom^2/2^64`. It is not a problem because a `denom^2 < 2^64` is that close to 0 that we can neglect it.

Finally, the theshold can overflow when multiplying the scaled weight with the `totalStacked` amount, especially when we have a low `denom`. For the lowest `denom` possible, when `denom^2 = 2^64`, we have that `2^128 * totalStaked * D` must be lesser than `2^256`, so we hit again the same restriction we had in the conviction formula: the stake token supply is below `2^128 / D`.

**Conclusion**: A safe number for the stake token supply is below `2^128/10^7`. This means that the max supply for a token with 18 decimals is around `2^128/10^7/10^18 = 34,028,236,692.093`, a large enough number.