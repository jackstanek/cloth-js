# Cloth simulation in Javascript

This repository contains a simple cloth simulation which models a
Hookean material. In particular, it simulates the "weft and weave"
using a mass-spring system, with a maximum deformation ratio, using
the procedure described in a paper by [Xavier Provot at INRIA in
1995](https://www.cs.rpi.edu/~cutler/classes/advancedgraphics/S14/papers/provot_cloth_simulation_96.pdf). The
masses comprising the cloth form a rectangular grid, and are connected
to their immediate horizontal and vertical neighbors. Each node is
also connected to its immediate diagonal neighbors, and has "weft" and
"weave" connections to its neighbors' immediate neighbors. See Figure
1 in the linked paper to see a diagram of the connections.

A live demo is available
[here](https://jackstanek.github.io/cloth-js). The demo includes a
user-controllable wind force. The wind force is just a simple
constant-valued vector field; there isn't any simulation of
compressible flow or its interaction with the cloth. This results in a
reduction of accuracy to the real world, but the wind effect allows
interaction with the cloth and shows the cloth dynamics quite
well. There also is not any self-collision handling, so the cloth
surface can intersect itself.
