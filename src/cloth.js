import { Vector3 } from 'three';

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

    updateNormal(norm) {
        this.normal.copy(norm.normalize());
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
        this.density1 = density + 1;

        this.nodes = [];
        this.springs = [];

        this.extraForces = [];
        this.meshes = [];

        const lenHalf = sideLen / 2;
        const inc = sideLen / density;
        const nodeMass = mass / (density * density + 2 * density + 1);

        for (let y = 0; y < this.density1; y++) {
            for (let x = 0; x < this.density1; x++) {
                const newNode = new Node(x * inc - lenHalf, lenHalf - y * inc, nodeMass);
                if (y == 0) {
                    newNode.fixed = true;
                }
                this.nodes.push(newNode);
            }
        }

        const structSpringLen = sideLen / density;
        const shearSpringLen = structSpringLen * Math.sqrt(2);
	const flexionSpringLen = structSpringLen * 2;

        for (let y = 0; y < this.density1; y++) {
            for (let x = 0; x < this.density1; x++) {
                const self = this.nodeAtPoint(x, y);
                if (x < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y),  // Right structural
                        structSpringLen, stiffness, damping, maxDeformation));
                }
		if (x < density - 1) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 2, y),  // Right flexion
                        flexionSpringLen, stiffness, damping, maxDeformation));
		}    
                if (y < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x, y + 1),  // Below structural
                        structSpringLen, stiffness, damping, maxDeformation));
                }
		if (y < density - 1) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x, y + 2),  // Below flexion
                        flexionSpringLen, stiffness, damping, maxDeformation));
		}
                if (x < density && y < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y + 1),  // Down shear
                        shearSpringLen, stiffness, damping, maxDeformation));
                }
                if (y > 0 && x < density) {
                    this.springs.push(new Spring(self, this.nodeAtPoint(x + 1, y - 1),  // Up shear
                        shearSpringLen, stiffness, damping, maxDeformation));
                }
            }
        }
    }

    shortenSprings() {
        this.springs.forEach(spring => spring.shorten());
    }

    nodeAtPoint(x, y) {
        return this.nodes[y * this.density1 + x];
    }

    addForce(force) {
        if (force instanceof Vector3) {
            this.extraForces.push((_) => { return force; });
        } else {
            this.extraForces.push(force);
        }
    }

    updateNormals() {
        for (let y = 0; y < this.density1; y++) {
            for (let x = 0; x < this.density1; x++) {
                let multiplier = -1;
                const currNode = this.nodeAtPoint(x, y);
                let horizNeighbor, vertNeighbor;

                if (x == this.density) {
                    multiplier *= -1;
                    horizNeighbor = this.nodeAtPoint(x - 1, y);
                } else {
                    horizNeighbor = this.nodeAtPoint(x + 1, y);
                }
                const horiz = horizNeighbor.pos.clone().sub(currNode.pos);

                if (y == this.density) {
                    multiplier *= -1;
                    vertNeighbor = this.nodeAtPoint(x, y - 1);
                } else {
                    vertNeighbor = this.nodeAtPoint(x, y + 1);
                }
                const vert = vertNeighbor.pos.clone().sub(currNode.pos);

                currNode.updateNormal(horiz.cross(vert).multiplyScalar(multiplier));
            }
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

    updateGeometry(geometry) {
        for (let yi = 0; yi < this.density1; yi++) {
            for (let xi = 0; xi < this.density1; xi++) {
                const pos = this.nodeAtPoint(xi, yi).pos;
                geometry.attributes.position.array[(yi * this.density1 + xi) * 3 + 0] = pos.x;
                geometry.attributes.position.array[(yi * this.density1 + xi) * 3 + 1] = pos.y;
                geometry.attributes.position.array[(yi * this.density1 + xi) * 3 + 2] = pos.z;
            }
        }
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.attributes.position.needsUpdate = true;
    }
}
