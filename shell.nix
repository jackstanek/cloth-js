{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
    packages = [
        pkgs.nodejs
        pkgs.deno
        pkgs.nodePackages.npm
    ];
}
