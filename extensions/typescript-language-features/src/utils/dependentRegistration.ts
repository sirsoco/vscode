/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ITypeScriptServiceClient } from '../typescriptService';
import API from './api';
import { Disposable } from './dispose';

export class ConditionalRegistration {
	private registration: vscode.Disposable | undefined = undefined;

	public constructor(
		private readonly _doRegister: () => vscode.Disposable
	) { }

	public dispose() {
		if (this.registration) {
			this.registration.dispose();
			this.registration = undefined;
		}
	}

	public update(enabled: boolean) {
		if (enabled) {
			if (!this.registration) {
				this.registration = this._doRegister();
			}
		} else {
			if (this.registration) {
				this.registration.dispose();
				this.registration = undefined;
			}
		}
	}
}

export class VersionDependentRegistration extends Disposable {
	private readonly _registration: ConditionalRegistration;

	constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly minVersion: API,
		register: () => vscode.Disposable,
	) {
		super();

		this._registration = this._register(new ConditionalRegistration(register));

		this._register(this.client.onTsServerStarted(() => {
			this.update(this.client.apiVersion);
		}));

		this.update(client.apiVersion);
	}

	private update(api: API) {
		this._registration.update(api.gte(this.minVersion));
	}
}


export class ConfigurationDependentRegistration extends Disposable {
	private readonly _registration: ConditionalRegistration;

	constructor(
		private readonly language: string,
		private readonly configValue: string,
		register: () => vscode.Disposable,
	) {
		super();
		this._registration = this._register(new ConditionalRegistration(register));

		this._register(vscode.workspace.onDidChangeConfiguration(this.update, this));

		this.update();
	}

	private update() {
		const config = vscode.workspace.getConfiguration(this.language, null);
		this._registration.update(!!config.get<boolean>(this.configValue));
	}
}
