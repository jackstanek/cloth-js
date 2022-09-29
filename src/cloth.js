import { PlaneGeometry, Vector3 } from 'three';

const GRAVITY = new Vector3(0, -9.8, 0);

export class Node {
    constructor(x, y, mass) {
        this.pos = new Vector3(x, y, 0);
        this.vel = new Vector3();
        this.force = new Vector3();
        this.mass = mass;
        this.fixed = false;
    }

    addForce(vec) {
        this.force.add(vec);
    }

    applyForce(dt) {
        if (this.fixed) {
            this.force.set(0, 0, 0);
            return;
        }
        this.vel.add(this.force.multiplyScalar(dt / this.mass));
        this.pos.add(this.vel.clone().multiplyScalar(dt));
        this.force.set(0, 0, 0);
    }
}

export class Spring {
    constructor(end1, end2, length, stiffness, damping) {
        this.ends = [end1, end2];
        this.length = length;
        this.stiffness = stiffness;
        this.damping = damping;
    }

    addForces() {
        const currLen = this.ends[0].pos.distanceTo(
            this.ends[1].pos);
        for (const endIdx of [0, 1]) {
            const otherIdx = (endIdx + 1) % 2;
            const springForceDir = this.ends[otherIdx].pos
                .clone()
                .sub(this.ends[endIdx].pos)
                .normalize()
            const springForce = springForceDir
                .multiplyScalar(this.stiffness * (currLen - this.length));  // Hooke's law
            const dampingForce = this.ends[endIdx].vel
                .clone()
                .negate()
                .multiplyScalar(this.damping);

            this.ends[endIdx].addForce(springForce.add(dampingForce));
        }
    }
}

export class Cloth {
    constructor(sideLen, density, mass, stiffness, damping) {
        this.sideLen = sideLen;

        const nodeMass = mass / (density * density + 2 * density + 1);
        this.density = density;
        this.nodes = [];
        this.springs = [];

        for (let y = 0; y < density + 1; y++) {
            for (let x = 0; x < density + 1; x++) {
                const newNode = new Node(x, y, nodeMass);
                if (x == 0 && y == 0 || x == density - 1 && y == 0) {
                    newNode.fixed = true;
                }
                this.nodes.push(newNode);
            }
        }

        const structSpringLen = sideLen / density;
        const shearSpringLen = structSpringLen * Math.sqrt(2);

        for (let y = 0; y < density; y++) {
            for (let x = 0; x < density; x++) {
                const self = this.nodeAtPoint(x, y);
                this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y),  // Right neighbor
                    structSpringLen, stiffness, damping));
                this.springs.push(new Spring(self, this.nodeAtPoint(x, y + 1),  // Below neighbor
                    structSpringLen, stiffness, damping));
                this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y + 1),  // Diagonal down neighbor
                    shearSpringLen, stiffness, damping));
                if (y > 0) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y - 1),  // Diagonal up neighbor
                        shearSpringLen, stiffness, damping));
                }
            }
        }

        this.geometry = new PlaneGeometry(sideLen, sideLen, density, density);
    }

    nodeAtPoint(x, y) {
        return this.nodes[y * this.density + x];
    }

    update(dt) {
        for (const spring of this.springs) {
            spring.addForces()
        }

        for (const node of this.nodes) {
            node.addForce(GRAVITY);
            node.applyForce(dt)
        }
    }

    updateGeometry() {
        for (let y = 0; y < this.density + 1; y++) {
            for (let x = 0; x < this.density + 1; x++) {
                const node = this.nodeAtPoint(x, y);
                const idx = 3 * (y * this.density + x);
                this.geometry.attributes.position.array[idx] = node.x;
                this.geometry.attributes.position.array[idx + 1] = node.y;
                this.geometry.attributes.position.array[idx + 2] = node.z;
            }
        }
        this.geometry.computeVertexNormals();
    }
}
