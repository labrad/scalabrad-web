from __future__ import division

import math
import random
import time

import labrad


def demo_1d_simple(dv):
    dv.new('demo_1d_simple', ['x [ms]'], ['y [V]'])
    for i in xrange(1000):
        x = i / 100
        y = 5 * math.sin(x) + random.random()
        dv.add([x, y])
        time.sleep(0.01)


def demo_1d_multi(dv):
    dv.new('demo_1d_multi',
           ['x [ms]'],
           ['y (1) [nV]', 'y (2) [nV]', 'y (3) [nV]',
            'y (4) [nV]', 'y (5) [nV]', 'y (6) [nV]'])
    for i in xrange(1000):
        x = i / 100
        row = [x]
        for i in range(6):
            y = 5 * math.sin(x + math.pi * i/5) + random.random()
            row.append(y)
        dv.add(row)
        time.sleep(0.01)


def demo_2d_simple(dv):
    dv.new('demo_2d_simple', ['x [GHz]', 'y [V]'], ['z [a.u.]'])
    for i in xrange(50):
        x = i / 10
        for j in xrange(50):
            y = j / 10
            z = 5 * math.cos((x**2 + y**2) / 10) + random.random()
            dv.add([x, y, z])
            time.sleep(0.01)


def demo_2d_vargrid(dv):
    dv.new('demo_2d_vargrid', ['x [GHz]', 'y [miles]'], ['z [nH]'])
    nx, ny = 50, 50
    dx = [1 + 5 * math.sin(3*math.pi * i / nx)**2 for i in range(nx)]
    dy = [1 + 5 * math.sin(2*math.pi * i / ny)**2 for i in range(ny)]
    rMax2 = sum(dx[:-1])**2 + sum(dy[:-1])**2
    for i in xrange(nx):
        x = sum(dx[:i])
        for j in xrange(ny):
            y = sum(dy[:j])
            z = 5 * math.cos(4*math.pi * (x**2 + y**2) / rMax2) + random.random()
            dv.add([x, y, z])
            time.sleep(0.01)


def main(dv):
    path = ['', 'Test', 'Demo']
    dv.cd(path, True)
    dirs, _ = dv.dir()
    new_dir = 'Demo{:04d}'.format(len(dirs))
    dv.cd(new_dir, True)
    path.append(new_dir)

    raw_input('Starting demo {}. Press [Enter] to continue. '.format(path))

    while True:
        print 'demo_1d_simple'
        demo_1d_simple(dv)

        print 'demo_1d_multi'
        demo_1d_multi(dv)

        print 'demo_2d_simple'
        demo_2d_simple(dv)

        print 'demo_2d_vargrid'
        demo_2d_vargrid(dv)


if __name__ == '__main__':
    with labrad.connect() as cxn:
        main(cxn.data_vault)
