import { PlaneGeometry, Vector3 } from 'three';

const GRAVITY = new Vector3(0, -9.8, 0);

export class Node {
    constructor(x, y, mass) {
        this.pos = new Vector3(x, y, 0);
        this.vel = new Vector3();
        this.force = new Vector3();
        this.mass = mass;
        this.fixed = false;

        this.normal = new Vector3(0, 0, 1);
    }

    addForce(vec) {
        this.force.add(vec);
    }

    applyForce(dt) {
        if (this.fixed) {
            this.force.set(0, 0, 0);
            this.vel.set(0, 0, 0);
            return;
        }
        this.vel.add(this.force.multiplyScalar(dt / this.mass));
        this.pos.add(this.vel.clone().multiplyScalar(dt));
        this.force.set(0, 0, 0);
    }
}

export class Spring {
    constructor(end1, end2, length, stiffness, damping, maxDeformation) {
        this.ends = [end1, end2];
        this.restingLength = length;
        this.maxLength = length * maxDeformation;
        this.stiffness = stiffness;
        this.damping = damping;
    }

    addForces() {
        const currLen = this.length()
        for (const endIdx of [0, 1]) {
            const otherIdx = (endIdx + 1) % 2;
            const springForceDir = this.ends[otherIdx].pos
                .clone()
                .sub(this.ends[endIdx].pos)
                .normalize()
            const springForce = springForceDir
                .multiplyScalar(this.stiffness * (currLen - this.restingLength));  // Hooke's law
            const dampingForce = this.ends[endIdx].vel
                .clone()
                .negate()
                .multiplyScalar(this.damping);

            this.ends[endIdx].addForce(springForce.add(dampingForce));
        }
    }

    length() {
        return this.ends[0].pos.distanceTo(this.ends[1].pos);
    }

    shorten() {
        const extraLen = (this.length() - this.maxLength);
        if (extraLen > 0) {
            for (const endIdx of [0, 1]) {
                if (this.ends[endIdx].fixed) {
                    continue;
                }

                const otherIdx = (endIdx + 1) % 2;
                const adjDir = this.ends[otherIdx].pos
                    .clone()
                    .sub(this.ends[endIdx].pos)
                    .normalize();
                if (this.ends[otherIdx].fixed) {
                    adjDir.multiplyScalar(extraLen);
                } else {
                    adjDir.multiplyScalar(extraLen / 2);
                }
                this.ends[endIdx].pos.add(adjDir);
            }
        }
    }
}

export class Cloth {
    constructor(sideLen, density, mass, stiffness, damping, maxDeformation) {
        this.sideLen = sideLen;
        this.density = density;

        this.nodes = [];
        this.springs = [];

        this.extraForces = [];
        this.meshes = [];

        const xi = -(sideLen / 2);
        const yi = sideLen / 2;
        const inc = sideLen / density;
        const nodeMass = mass / (density * density + 2 * density + 1);

        for (let y = 0; y <= density; y++) {
            for (let x = 0; x <= density; x++) {
                const newNode = new Node(xi + x * inc, yi - y * inc, nodeMass);
                if (x == 0 && y == 0 || x == density && y == 0) {
                    newNode.fixed = true;
                }
                this.nodes.push(newNode);
            }
        }

        const structSpringLen = sideLen / density;
        const shearSpringLen = structSpringLen * Math.sqrt(2);

        for (let y = 0; y <= density; y++) {
            for (let x = 0; x <= density; x++) {
                const self = this.nodeAtPoint(x, y);
                if (x < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y),  // Right neighbor
                        structSpringLen, stiffness, damping, maxDeformation));
                }
                if (y < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x, y + 1),  // Below neighbor
                        structSpringLen, stiffness, damping, maxDeformation));
                }
                if (x < density && y < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y + 1),  // Diagonal down neighbor
                        shearSpringLen, stiffness, damping, maxDeformation));
                }
                if (y > 0 && x < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y - 1),  // Diagonal up neighbor
                        shearSpringLen, stiffness, damping, maxDeformation));
                }
            }
        }
    }

    shortenSprings() {
        this.springs.forEach(spring => spring.shorten());
    }

    nodeAtPoint(x, y) {
        return this.nodes[y * (this.density + 1) + x];
    }

    addForce(force) {
        if (force instanceof Vector3) {
            this.extraForces.push((_) => { return force; });
        } else {
            this.extraForces.push(force);
        }
    }

    update(dt) {
        this.springs.forEach(spring => {
            spring.shorten();
            spring.addForces()
        });

        this.nodes.forEach(node => {
            this.extraForces.forEach(force => node.addForce(force(node)));
            node.applyForce(dt);
        });

        this.updateNormals();
    }
}
