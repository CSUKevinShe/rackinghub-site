/*
 * RackingHub Planner — three-view.js
 * Three.js 3D interactive preview for warehouse racking
 * Chinese comments, English UI text
 */

(function () {
    'use strict';

    var ThreePreview = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        rackGroup: null,
        animationId: null,
        initialized: false,

        // Initialize 3D preview
        init: function () {
            var canvas = document.getElementById('canvas-3d');
            if (!canvas) return;

            var container = canvas.parentElement;
            if (!container || container.offsetParent === null) return;

            var loading = document.getElementById('3d-loading');
            if (loading) loading.style.display = 'block';

            // Dynamic import of Three.js modules
            import('three').then(function (THREE) {
                import('three/addons/controls/OrbitControls.js').then(function (module) {
                    var OrbitControls = module.OrbitControls;
                    ThreePreview._initScene(THREE, OrbitControls, canvas);
                    ThreePreview._initLights(THREE);
                    ThreePreview._initGround(THREE);
                    ThreePreview._initControls(OrbitControls);
                    ThreePreview._startAnimation();
                    ThreePreview.initialized = true;

                    // Build rack model from LayoutEngine params
                    ThreePreview._buildRackModel(THREE);

                    if (loading) loading.style.display = 'none';
                }).catch(function () {
                    ThreePreview._showError('Failed to load OrbitControls');
                });
            }).catch(function () {
                ThreePreview._showError('3D preview unavailable — Three.js failed to load');
            });
        },

        _showError: function (msg) {
            var canvas = document.getElementById('canvas-3d');
            var container = canvas ? canvas.parentElement : null;
            if (container) {
                container.innerHTML = '<div style="padding:2rem;text-align:center;color:#64748b;font-style:italic;">' + msg + '</div>';
            }
        },

        _initScene: function (THREE, OrbitControls, canvas) {
            var container = canvas.parentElement;
            var w = container.clientWidth - 16;
            var h = 320;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xeef1f5);

            this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
            this.camera.position.set(12, 8, 12);
            this.camera.lookAt(0, 2, 0);

            this.renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                antialias: true
            });
            this.renderer.setSize(w, h);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;

            this.rackGroup = new THREE.Group();
            this.scene.add(this.rackGroup);
        },

        _initLights: function (THREE) {
            var ambient = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambient);

            var directional = new THREE.DirectionalLight(0xffffff, 0.8);
            directional.position.set(8, 12, 8);
            directional.castShadow = true;
            this.scene.add(directional);

            var fill = new THREE.DirectionalLight(0xffffff, 0.3);
            fill.position.set(-5, 4, -5);
            this.scene.add(fill);
        },

        _initGround: function (THREE) {
            var ground = new THREE.Mesh(
                new THREE.PlaneGeometry(30, 30),
                new THREE.MeshStandardMaterial({
                    color: 0xd5dae2,
                    roughness: 0.95
                })
            );
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            this.scene.add(ground);

            // Subtle grid helper matching engineering drawing style
            var grid = new THREE.GridHelper(30, 30, 0xb0b8c4, 0xc8cfd6);
            grid.position.y = 0.01;
            this.scene.add(grid);
        },

        _initControls: function (OrbitControls) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 1.0;
            this.controls.minDistance = 3;
            this.controls.maxDistance = 40;
            this.controls.maxPolarAngle = Math.PI / 2.1;
            this.controls.target.set(0, 2, 0);
        },

        _startAnimation: function () {
            var self = this;
            function animate() {
                self.animationId = requestAnimationFrame(animate);
                self.controls.update();
                self.renderer.render(self.scene, self.camera);
            }
            animate();
        },

        _clearRackModel: function () {
            if (this.rackGroup) {
                while (this.rackGroup.children.length > 0) {
                    var child = this.rackGroup.children[0];
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                    this.rackGroup.remove(child);
                }
            }
        },

        // Build rack model from LayoutEngine params
        _buildRackModel: function (THREE) {
            if (!this.rackGroup || !LayoutEngine) return;

            this._clearRackModel();

            var p = LayoutEngine.params;
            var preset = this._getPreset(p.rackingType);
            var levels = p.levels;
            var palletsPerBay = p.palletsPerLevel;
            var bayWidth = preset.rackWidth;
            var rackDepth = preset.rackDepth;
            var levelHeight = 2.0; // meters per level
            var totalHeight = levels * levelHeight;

            // Materials
            var uprightMat = new THREE.MeshStandardMaterial({
                color: 0x1e40af,
                roughness: 0.6,
                metalness: 0.3
            });
            var beamMat = new THREE.MeshStandardMaterial({
                color: 0xf59e0b,
                roughness: 0.5,
                metalness: 0.2
            });
            var palletMat = new THREE.MeshStandardMaterial({
                color: 0xd1d5db,
                roughness: 0.8
            });
            var columnMat = new THREE.MeshStandardMaterial({
                color: 0x64748b,
                roughness: 0.7,
                transparent: true,
                opacity: 0.35
            });

            // ===== Build rack section =====
            // We render a single bay section for clarity
            var uprightW = 0.08;
            var uprightD = 0.08;
            var beamH = p.beamHeight / 1000; // convert mm to meters
            var palletWm = p.palletWidth / 1000;
            var palletDm = p.palletDepth / 1000;
            var palletHm = p.palletHeight / 1000;
            var gapM = p.interPalletGap / 1000;

            // Upright frames (vertical)
            var numUprights = palletsPerBay + 1;
            for (var u = 0; u < numUprights; u++) {
                var ux = u * bayWidth - uprightW / 2;
                var upright = new THREE.Mesh(
                    new THREE.BoxGeometry(uprightW, totalHeight, uprightD),
                    uprightMat
                );
                upright.position.set(ux, totalHeight / 2, 0);
                upright.castShadow = true;
                this.rackGroup.add(upright);

                // Second row of uprights (back depth)
                var upright2 = upright.clone();
                upright2.position.z = rackDepth;
                this.rackGroup.add(upright2);
            }

            // Beams (horizontal) at each level
            for (var lv = 0; lv < levels; lv++) {
                var beamY = (lv + 1) * levelHeight;

                // Front beams
                for (var b = 0; b < palletsPerBay; b++) {
                    var beamX = b * bayWidth + bayWidth / 2;
                    var beamLen = bayWidth - uprightW;
                    var beam = new THREE.Mesh(
                        new THREE.BoxGeometry(beamLen, beamH, uprightD),
                        beamMat
                    );
                    beam.position.set(beamX, beamY, 0);
                    beam.castShadow = true;
                    this.rackGroup.add(beam);

                    // Back beams
                    var beam2 = beam.clone();
                    beam2.position.z = rackDepth;
                    this.rackGroup.add(beam2);
                }

                // Side beams (connecting front and back)
                for (var s = 0; s <= palletsPerBay; s++) {
                    var sx = s * bayWidth;
                    var sideBeam = new THREE.Mesh(
                        new THREE.BoxGeometry(uprightW, beamH, rackDepth),
                        beamMat
                    );
                    sideBeam.position.set(sx, beamY, rackDepth / 2);
                    sideBeam.castShadow = true;
                    this.rackGroup.add(sideBeam);
                }

                // Pallets on this level
                for (var pl = 0; pl < palletsPerBay; pl++) {
                    var palletX = pl * bayWidth + bayWidth / 2;
                    var palletY = beamY + palletHm / 2;

                    var pallet = new THREE.Mesh(
                        new THREE.BoxGeometry(palletWm, palletHm, palletDm),
                        palletMat
                    );
                    pallet.position.set(palletX, palletY, rackDepth * 0.3);
                    pallet.castShadow = true;
                    this.rackGroup.add(pallet);
                }
            }

            // Brace material — thinner, lighter color
            var braceMat = new THREE.MeshStandardMaterial({
                color: 0x3b82f6,
                roughness: 0.6,
                metalness: 0.2
            });

            // ===== Braces on frame faces (横斜撑) =====
            // Horizontal braces every 300mm + diagonal zigzag between them
            var braceSpacing = 0.3; // 300mm
            var braceThick = 0.025; // 25mm tube
            var firstBeamY = levelHeight; // first beam height from LayoutEngine
            var numHBraces = Math.ceil(firstBeamY / braceSpacing);

            // Render braces for each upright bay (between adjacent uprights)
            for (var u = 0; u < numUprights - 1; u++) {
                var bayStartX = u * bayWidth;
                var bayLen = bayWidth - uprightW;
                var braceZs = [0, rackDepth]; // front face and back face

                for (var fz = 0; fz < braceZs.length; fz++) {
                    var braceZ = braceZs[fz];

                    for (var h = 0; h <= numHBraces; h++) {
                        var braceY = h * braceSpacing;
                        if (braceY > firstBeamY + 0.05) continue;

                        // Horizontal brace
                        var hBrace = new THREE.Mesh(
                            new THREE.BoxGeometry(bayLen, braceThick, braceThick),
                            braceMat
                        );
                        hBrace.position.set(bayStartX + bayLen / 2, braceY, braceZ);
                        hBrace.castShadow = true;
                        this.rackGroup.add(hBrace);

                        // Diagonal brace (zigzag) — skip if only one horizontal brace
                        if (h < numHBraces) {
                            var nextY = (h + 1) * braceSpacing;
                            if (nextY > firstBeamY + 0.05) continue;

                            var diagDx = bayLen;
                            var diagDy = nextY - braceY;
                            var diagLen = Math.sqrt(diagDx * diagDx + diagDy * diagDy);
                            var diagAngle = Math.atan2(diagDy, diagDx);

                            // Alternate direction: even=left-to-right-up, odd=right-to-left-up
                            var diag = new THREE.Mesh(
                                new THREE.BoxGeometry(diagLen, braceThick, braceThick),
                                braceMat
                            );
                            if (h % 2 === 0) {
                                // rising left→right
                                diag.position.set(bayStartX + bayLen / 2, braceY + diagDy / 2, braceZ);
                                diag.rotation.z = diagAngle;
                            } else {
                                // rising right→left
                                diag.position.set(bayStartX + bayLen / 2, braceY + diagDy / 2, braceZ);
                                diag.rotation.z = -diagAngle;
                            }
                            diag.castShadow = true;
                            this.rackGroup.add(diag);
                        }
                    }
                }
            }

            // ===== Building columns =====
            var colSizeM = p.columnSize / 1000;
            var colSpacingX = p.columnSpacingX;
            var colSpacingY = p.columnSpacingY;

            // Show columns around the rack area
            var rackLength = palletsPerBay * bayWidth;
            for (var cx = 0; cx <= rackLength + colSpacingX; cx += colSpacingX) {
                for (var cz = 0; cz <= rackDepth + colSpacingY; cz += colSpacingY) {
                    // Skip if too close to uprights
                    if (this._tooCloseToUpright(cx, cz, numUprights, bayWidth)) continue;

                    var column = new THREE.Mesh(
                        new THREE.BoxGeometry(colSizeM, totalHeight + 1, colSizeM),
                        columnMat
                    );
                    column.position.set(cx - rackLength / 2, (totalHeight + 1) / 2, cz);
                    column.castShadow = false;
                    this.rackGroup.add(column);
                }
            }

            // Center the model
            var bbox = new THREE.Box3().setFromObject(this.rackGroup);
            var center = bbox.getCenter(new THREE.Vector3());
            this.rackGroup.position.x -= center.x;
            this.rackGroup.position.z -= center.z;
        },

        _tooCloseToUpright: function (cx, cz, numUprights, bayWidth) {
            for (var u = 0; u <= numUprights; u++) {
                var ux = u * bayWidth;
                if (Math.abs(cx - ux) < 0.3) return true;
            }
            return false;
        },

        _getPreset: function (type) {
            var presets = {
                'selective-heavy': { aisleWidth: 3.2, rackDepth: 1.0, rackWidth: 2.7 },
                'selective-medium': { aisleWidth: 3.0, rackDepth: 0.9, rackWidth: 2.5 },
                'drive-in': { aisleWidth: 3.0, rackDepth: 1.0, rackWidth: 2.4 },
                'radio-shuttle': { aisleWidth: 3.0, rackDepth: 1.0, rackWidth: 2.7 },
                'vna': { aisleWidth: 1.8, rackDepth: 1.0, rackWidth: 2.4 },
                'push-back': { aisleWidth: 3.2, rackDepth: 1.0, rackWidth: 2.4 }
            };
            return presets[type] || presets['selective-heavy'];
        },

        // Rebuild rack model (call when params change)
        rebuild: function () {
            if (!this.initialized || !this.rackGroup) return;
            import('three').then(function (THREE) {
                ThreePreview._buildRackModel(THREE);
            });
        },

        // Resize handler
        resize: function () {
            if (!this.renderer) return;
            var canvas = document.getElementById('canvas-3d');
            var container = canvas ? canvas.parentElement : null;
            if (!container) return;

            var w = container.clientWidth - 16;
            var h = 320;

            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        },

        // Dispose and cleanup
        destroy: function () {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            if (this.renderer) {
                this.renderer.dispose();
                this.renderer = null;
            }
            this.initialized = false;
        }
    };

    // Export to global
    window.ThreePreview = ThreePreview;

    // Initialize when DOM is ready and canvas exists
    function initWhenReady() {
        var canvas = document.getElementById('canvas-3d');
        if (canvas && canvas.offsetParent !== null) {
            ThreePreview.init();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(initWhenReady, 500);
        });
    } else {
        setTimeout(initWhenReady, 500);
    }

    // Resize handler
    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (ThreePreview.initialized) {
                ThreePreview.resize();
            }
        }, 250);
    });

})();
