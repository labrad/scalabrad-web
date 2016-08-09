type FittedParabola = {
  coefficients: {A: number, B: number, C: number},
  data: number[][]
};

type FittedExponent = {
  coefficients: {A: number, B: number},
  data: number[][]
};

/**
 * Fits a parabola given an array of 2D points using Least-Squares Fitting for
 * a Second-Order Polynomial.
 *
 * Returns both the coefficients of the fitted function, as well as a uniformly
 * sampled array of 2D points between the range specified.
 *
 * Citation:
 * Weisstein, Eric W. "Least Squares Fitting--Polynomial."
 * From MathWorld--A Wolfram Web Resource.
 * http://mathworld.wolfram.com/LeastSquaresFittingPolynomial.html
 */
export function fitParabola(data: number[][],
                            xMin: number,
                            xMax: number,
                            samples: number = 1000) {
  if (samples < 1) {
    samples = 1;
  }

  let n = 0,
      sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX3 = 0,
      sumX4 = 0,
      sumX2 = 0,
      sumX2Y = 0;

  const dataLength = data.length;
  for (let i = 0; i < dataLength; i++) {
    const row = data[i];
    const [x, y] = row;

    n += 1;
    sumX += x;
    sumX2 += Math.pow(x, 2);
    sumX3 += Math.pow(x, 3);
    sumX4 += Math.pow(x, 4);

    sumY += y;
    sumXY += x * y;
    sumX2Y += Math.pow(x, 2) * y;
  }

  let [A, B, C] = [NaN, NaN, NaN];
  const fittedParabola = [];

  // Ignoring the sum symbols, the matrix for a polynomial of the 2nd order is:
  // n     x     x**2
  // x     x**2  x**3
  // x**2  x**3  x**4
  //
  // The determinant is therefore:
  //   (n * x**2 * x**4)
  // + (x * x**2 * x**3)
  // + (x * x**2 * x**3)
  // - (x**2 * x**2 * x**2)
  // - (n * x**3 * x**3)
  // - (x * x * x**4)
  const determinant = (n * sumX4 * sumX2)
                    + (sumX * sumX2 * sumX3)
                    + (sumX * sumX2 * sumX3)
                    - (n * sumX3 * sumX3)
                    - (sumX * sumX * sumX4)
                    - (sumX2 * sumX2 * sumX2);

  if (determinant) {
    A = ((n * sumX2Y * sumX2)
      - (n * sumX3 * sumXY)
      + (sumX * sumX2 * sumXY)
      - (sumX * sumX * sumX2Y)
      + (sumY * sumX * sumX3)
      - (sumY * sumX2 * sumX2)) / determinant;

    B = ((sumX * sumX2Y * sumX2)
      - (sumX * sumX4 * sumY)
      - (sumX3 * n * sumX2Y)
      + (sumX3 * sumY * sumX2)
      - (sumXY * sumX2 * sumX2)
      + (sumX4 * n * sumXY)) / determinant;

    C = ((sumX2Y * sumX * sumX3)
      - (sumX2Y * sumX2 * sumX2)
      - (sumX3 * sumX3 * sumY)
      + (sumXY * sumX2 * sumX3)
      - (sumX4 * sumX * sumXY)
      + (sumX4 * sumY * sumX2)) / determinant;

    const equation = (A, B, C, x) => {
      return A * Math.pow(x, 2) + B * x + C;
    };

    // Collect uniform samples from the fit along the provided range.
    const stepSize = (xMax - xMin) / samples;
    for (let i = 0; i < samples; ++i) {
      const x = xMin + i * stepSize;
      const y = equation(A, B, C, x);
      fittedParabola.push([x, y]);
    }
  }

  return {
    coefficients: {A: A, B: B, C: C},
    data: fittedParabola
  };
}


/**
 * Fits an exponential given an array of 2D points using least-squared fitting
 * for an exponential.
 *
 * Returns both the coefficients of the fitted function, as well as a uniformly
 * sampled array of 2D points between the range specified.
 *
 * Citation:
 * Weisstein, Eric W. "Least Squares Fitting--Exponential."
 * From MathWorld -- A Wolfram Web Resource.
 * http://mathworld.wolfram.com/LeastSquaresFittingExponential.html
 */
export function fitExponential(data: number[][],
                               xMin: number,
                               xMax: number,
                               samples: number = 1000) {
  if (samples < 1) {
    samples = 1;
  }

  let sumY = 0;
  let sumXY = 0;
  let sumYLogY = 0;
  let sumXYLogY = 0;
  let sumX2Y = 0;

  const dataLength = data.length;
  for (let i = 0; i < dataLength; i++) {
    const row = data[i];
    const [x, y] = row;

    if (y < 0) {
      continue;
    }

    sumX2Y += Math.pow(x, 2) * y;
    sumYLogY += y * Math.log(y);
    sumXY += x * y;
    sumXYLogY += x * y * Math.log(y);
    sumY += y;
  }

  let [A, B] = [NaN, NaN];
  const fittedExponential = [];
  const denominator = (sumY * sumX2Y - Math.pow(sumXY, 2));

  if (denominator) {
    const a = (sumX2Y * sumYLogY - sumXY * sumXYLogY) / denominator;
    const b = (sumY * sumXYLogY - sumXY * sumYLogY) / denominator;

    A = Math.pow(Math.E, a);
    B = b;

    const equation = (A, B, x) => {
      return A * Math.pow(Math.E, B * x);
    };

    // Collect uniform samples from the fit along the provided range.
    const stepSize = (xMax - xMin) / samples;
    for (let i = 0; i < samples; i++) {
      const x = xMin + i * stepSize;
      const y = equation(A, B, x);
      fittedExponential.push([x, y]);
    }
  }

  return {
    coefficients: {A: A, B: B},
    data: fittedExponential
  };
}
