/**
 * Docker Client Abstraction
 *
 * Wraps dockerode library to provide a clean interface for container management.
 * Handles container lifecycle: create, start, wait, logs, remove
 */

import Docker from 'dockerode';
import type { DockerContainerConfig } from './types.js';

/**
 * Container interface representing a Docker container
 */
export interface Container {
  id: string;
  start(): Promise<void>;
  wait(): Promise<{ StatusCode: number }>;
  logs(): Promise<{ stdout: string; stderr: string }>;
  remove(): Promise<void>;
  inspect(): Promise<{
    State: {
      Running: boolean;
      ExitCode: number;
      StartedAt: string;
      FinishedAt: string;
    };
  }>;
}

/**
 * DockerClient interface for container management
 */
export interface DockerClient {
  createContainer(config: DockerContainerConfig): Promise<Container>;
  isAvailable(): Promise<boolean>;
  pullImage(imageName: string): Promise<void>;
  removeContainer(containerId: string): Promise<void>;
  killContainer(containerId: string): Promise<void>;
}

/**
 * Implementation of DockerClient using dockerode
 */
export class DockerodeClient implements DockerClient {
  private docker: Docker;

  constructor(options?: Docker.DockerOptions) {
    this.docker = new Docker(options);
  }

  /**
   * Check if Docker daemon is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull Docker image if not present
   */
  async pullImage(imageName: string): Promise<void> {
    try {
      // Check if image exists locally
      await this.docker.getImage(imageName).inspect();
    } catch (error) {
      // Image doesn't exist, pull it
      return new Promise((resolve, reject) => {
        this.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(stream, (err: Error | null) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });
    }
  }

  /**
   * Create a new container
   */
  async createContainer(config: DockerContainerConfig): Promise<Container> {
    const dockerContainer = await this.docker.createContainer({
      Image: config.Image,
      Cmd: config.Cmd,
      Env: config.Env,
      WorkingDir: config.WorkingDir,
      HostConfig: config.HostConfig
    });

    const containerId = dockerContainer.id;

    return {
      id: containerId,

      async start(): Promise<void> {
        await dockerContainer.start();
      },

      async wait(): Promise<{ StatusCode: number }> {
        const result = await dockerContainer.wait();
        return { StatusCode: (result as any).StatusCode };
      },

      async logs(): Promise<{ stdout: string; stderr: string }> {
        const stream = await dockerContainer.logs({
          stdout: true,
          stderr: true,
          follow: false
        });

        // Docker multiplexes stdout and stderr in a single stream
        // Each frame has an 8-byte header:
        // - byte 0: stream type (0=stdin, 1=stdout, 2=stderr)
        // - bytes 4-7: frame size (big-endian uint32)
        const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream as any);
        let stdout = '';
        let stderr = '';
        let offset = 0;

        while (offset < buffer.length) {
          if (offset + 8 > buffer.length) break;

          const streamType = buffer[offset];
          const frameSize = buffer.readUInt32BE(offset + 4);

          if (offset + 8 + frameSize > buffer.length) break;

          const frame = buffer.subarray(offset + 8, offset + 8 + frameSize).toString('utf-8');

          if (streamType === 1) {
            stdout += frame;
          } else if (streamType === 2) {
            stderr += frame;
          }

          offset += 8 + frameSize;
        }

        return { stdout, stderr };
      },

      async remove(): Promise<void> {
        await dockerContainer.remove({ force: true });
      },

      async inspect() {
        const info = await dockerContainer.inspect();
        return {
          State: {
            Running: info.State.Running,
            ExitCode: info.State.ExitCode,
            StartedAt: info.State.StartedAt,
            FinishedAt: info.State.FinishedAt
          }
        };
      }
    };
  }

  /**
   * Remove a container by ID
   */
  async removeContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force: true });
    } catch (error) {
      // Ignore error if container doesn't exist
      if (!(error as any).statusCode || (error as any).statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Kill a running container
   */
  async killContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.kill();
    } catch (error) {
      // Ignore error if container doesn't exist
      if (!(error as any).statusCode || (error as any).statusCode !== 404) {
        throw error;
      }
    }
  }
}
