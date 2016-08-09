from __future__ import division

import math
import random
import time

import labrad
from labrad.util import hydrant


def add_params(dv):
    for i in range(100):
        t = hydrant.randType(noneOkay=False)
        v = hydrant.randValue(t)
        name = 'param{:04d}'.format(i)
        dv.add_parameter(name, v)


# a list of all registered demo functions
demos = []


def demo(func):
    """Decorator to register a function in the list of demos"""
    demos.append(func)
    return func

@demo
def demo_1d_exponential(dv):
    dv.new('demo_1d_exponential', ['x [ms]'], ['y [V]'])
    add_params(dv)

    # Generate points between -5 and 5 in 0.1 increments
    for i in range(-50, 50):
        x = 0.1 * i
        y = math.e**(-x) + random.random()*10
        dv.add([x, y])
        time.sleep(0.002)

@demo
def demo_1d_parabola(dv):
    dv.new('demo_1d_parabola', ['x [ms]'], ['y [V]'])
    add_params(dv)
    for i in xrange(-1000, 1000):
        x = i
        y = i**2 + i + random.random()*5000
        dv.add([x, y])
        time.sleep(0.002)

@demo
def demo_1d_parabola_2(dv):
    dv.new('demo_1d_parabola_2', ['x [ms]'], ['y [V]'])
    add_params(dv)
    for i in xrange(-100, 100):
        x = i
        y = 10 * i**2 + i + random.random()*5000 + 500
        dv.add([x, y])
        time.sleep(0.002)

@demo
def demo_1d_simple(dv):
    dv.new('demo_1d_simple', ['x [ms]'], ['y [V]'])
    add_params(dv)
    for i in xrange(1000):
        x = i / 100
        y = 5 * math.sin(x) + random.random() - 0.5
        dv.add([x, y])
        time.sleep(0.002)


@demo
def demo_1d_multi_high_variance(dv):
    dv.new('demo_1d_high_var',
           ['x [ms]'],
           ['y (1) [nV]', 'y (2) [nV]', 'y (3) [nV]',
            'y (4) [nV]', 'y (5) [nV]', 'y (6) [nV]'])
    add_params(dv)
    amplitudes = [15, 1, 3, 5, 7, 9]
    offsets = [100, -50, 10, 0, 0, 0]
    for i in xrange(1000):
        x = i / 100
        row = [x]
        for i in range(6):
            y = 5 * amplitudes[i] * math.sin(x + math.pi * i/5) + offsets[i] + random.random() - 0.5
            row.append(y)
        dv.add(row)
        time.sleep(0.002)


@demo
def demo_1d_multi(dv):
    dv.new('demo_1d_multi',
           ['x [ms]'],
           ['y (1) [nV]', 'y (2) [nV]', 'y (3) [nV]',
            'y (4) [nV]', 'y (5) [nV]', 'y (6) [nV]'])
    add_params(dv)
    for i in xrange(1000):
        x = i / 100
        row = [x]
        for i in range(6):
            y = 5 * math.sin(x + math.pi * i/5) + random.random() - 0.5
            row.append(y)
        dv.add(row)
        time.sleep(0.002)


@demo
def demo_2d_simple(dv):
    dv.new('demo_2d_simple', ['x [GHz]', 'y [V]'], ['z [a.u.]'])
    add_params(dv)
    for i in xrange(50):
        x = i / 10
        for j in xrange(50):
            y = j / 10
            z = 5 * math.cos((x**2 + y**2) / 10) + random.random() - 0.5
            dv.add([x, y, z])
            time.sleep(0.002)


@demo
def demo_2d_multi(dv):
    dv.new('demo_2d_multi', ['x [GHz]', 'y [V]'],
     ['z1 [a.u.]', 'z2 [a.u]'])
    add_params(dv)
    for i in xrange(50):
        x = i / 10
        for j in xrange(50):
            y = j / 10
            z1 = 5 * math.cos((x**2 + y**2) / 10) + random.random() - 0.5
            z2 = 5 * 0
            dv.add([x, y, z1, z2])
            time.sleep(0.002)


@demo
def demo_2d_vargrid(dv):
    dv.new('demo_2d_vargrid', ['x [GHz]', 'y [miles]'], ['z [nH]'])
    add_params(dv)
    nx, ny = 50, 50
    dx = [1 + 5 * math.sin(3*math.pi * i / nx)**2 for i in range(nx)]
    dy = [1 + 5 * math.sin(2*math.pi * i / ny)**2 for i in range(ny)]
    rMax2 = sum(dx[:-1])**2 + sum(dy[:-1])**2
    for i in xrange(nx):
        x = sum(dx[:i])
        for j in xrange(ny):
            y = sum(dy[:j])
            z = 5 * math.cos(4*math.pi * (x**2 + y**2) / rMax2) + random.random() - 0.5
            dv.add([x, y, z])
            time.sleep(0.002)


@demo
def demo_2d_sparse(dv):
    dv.new('demo_2d_sparse', ['x', 'y'], ['z'])
    add_params(dv)
    nx, ny = 100, 20
    for i in xrange(-nx, nx+1):
        x = i
        y_center = 100 * (1 if x == 0 else math.sin(x / 10) / (x / 10))
        y_grid_center = math.floor(y_center)
        for j in xrange(-ny, ny+1):
            y = y_grid_center + j
            z = 1 / (1 + (y - y_center)**2 / (ny/4)**2) + (random.random() - 0.5) * 0.1
            dv.add([x/10, y/10, z])
            time.sleep(0.002)


@demo
def demo_2d_sparse_rectfill(dv):
    dv.new('demo_2d_sparse_rectfill', ['x', 'y'], ['z'])
    add_params(dv)
    nx, ny = 100, 20
    for i in xrange(-nx, nx+1):
        x = i
        y_center = 100 * (1 if x == 0 else math.sin(x / 10) / (x / 10))
        y_grid_center = y_center
        for j in xrange(-ny, ny+1):
            y = y_grid_center + j
            z = 1 / (1 + (y - y_center)**2 / (ny/4)**2) + (random.random() - 0.5) * 0.1
            dv.add([x/10, y/10, z])
            time.sleep(0.002)


@demo
def demo_1d_x_coords(dv):
    dv.new('demo_1d_x_coords', ['x'], ['y'])
    add_params(dv)
    data = [
        [ 0.,          0.29340001],
        [  1.00000000e+07,   2.02666955e+00],
        [  2.00000000e+07,  -4.01688210e+00],
        [  3.00000000e+07,   5.14093998e+00],
        [  4.00000000e+07,  -5.02656140e+00],
        [  5.00000000e+07,   4.51872983e+00],
        [  6.00000000e+07,  -2.32641769e+00],
        [  7.00000000e+07,   6.34071053e-01],
        [  8.00000000e+07,   2.06855246e+00],
        [  9.00000000e+07,  -3.31805019e+00],
    ]
    dv.add(data)


def main(dv):
    path = ['', 'Test', 'Demo']
    dv.cd(path, True)
    dirs, _ = dv.dir()
    new_dir = 'Demo{:04d}'.format(len(dirs))
    dv.cd(new_dir, True)
    path.append(new_dir)

    raw_input('Starting demo {}. Press [Enter] to continue. '.format(path))

    while True:
        for func in demos:
            print func.__name__
            func(dv)


if __name__ == '__main__':
    with labrad.connect() as cxn:
        main(cxn.data_vault)
