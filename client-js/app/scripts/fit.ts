export function fitParabola(data, yColumn=1) {
  const dataLength = data.length;

  let k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0,
      p = 0,
      q = 0,
      r = 0;

  for (let i = 0; i < dataLength; i++) {
    const row = data[i];
    const x = row[0];
    const y = row[yColumn];

    k += y;
    l += x * y;
    m += Math.pow(x, 2) * y;
    n += 1;
    o += x;
    p += Math.pow(x, 2);
    q += Math.pow(x, 3);
    r += Math.pow(x, 4);
  }

  const d = (n * r * p)
          - (n * q * q)
          - (o * o * r)
          + (2 * o * p * q)
          - Math.pow(p, 3);

  if (d) {
    const A = ((n * m * p)
        - (n * q * l)
        + (o * p * l)
        - (o * o * m)
        + (k * o * q)
        - (k * p * p)) / d;
    const B = ((o*m*p)
        - (o*r*k)
        - (q*n*m)
        + (q*k*p)
        - (l*p*p)
        + (r*n*l)) / d;
    const C = ((m*o*q)
        - (m*p*p)
        - (q*q*k)
        + (l*p*q)
        - (r*o*l)
        + (r*k*p)) / d;

    if (A) {
      const equation = (A, B, C, x) => {
        return A*Math.pow(x, 2) + B*x + C;
      };

      const fittedParabola = [];
      for (let i = 0; i < dataLength; i++) {
        const row = data[i];
        const x = row[0];
        const y = equation(A, B, C, x);
        fittedParabola.push([x, y]);
      }

      return {
        coefficients: {
          A: A,
          B: B,
          C: C
        },
        data: fittedParabola
      };
    }
  }

  return {
    coefficients: {A: NaN, B: NaN, C: NaN},
    data: []
  };
}

export function fitExponential(data, yColumn: number = 1) {
  const dataLength = data.length;

  let k = 0,
      l = 0,
      m = 0,
      n = 0,
      o = 0;

  for (let i = 0; i < dataLength; i++) {
    const row = data[i];
    const x = row[0];
    const y = row[yColumn];

    if (y < 0) {
      continue;
    }

    k += Math.pow(x, 2) * y;
    l += y * Math.log(y);
    m += x * y;
    n += x * y * Math.log(y);
    o += y;
  }

  const d = (o * k - Math.pow(m, 2));

  if (d) {
    const A = Math.pow(Math.E, (k * l - m * n) / d);
    const B = (o * n - m * l) / d;

    const equation = (A, B, x) => {
      return A * Math.pow(Math.E, B * x);
    };

    const fittedExponential = [];
    for (let i = 0; i < dataLength; i++) {
      const row = data[i];
      const x = row[0];
      const dataY = row[yColumn];

      if (dataY < 0) {
        continue;
      }

      const y = equation(A, B, x);
      fittedExponential.push([x, y]);
    }

    return {
      coefficients: {A: A, B: B},
      data: fittedExponential
    };
  }

  return {
    coefficients: {A: NaN, B: NaN},
    data: []
  };
}
